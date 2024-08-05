const bs58 = require('bs58');
const fs = require('fs');
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');

// ANSI escape codes for color
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Read the RPC URL from rpc.txt
const rpcUrl = fs.readFileSync('rpc.txt', 'utf8').trim();
const connection = new Connection(rpcUrl, 'confirmed');

// Load the list of private keys from the privates.txt file
const loadPrivateKeys = () => {
    try {
        const data = fs.readFileSync('privates.txt', 'utf8');
        return data.trim().split('\n').map(key => key.trim());
    } catch (error) {
        console.error(`${RED}Error reading privates.txt file:${RESET}`, error);
        return [];
    }
};

// Convert lamports to SOL
const lamportsToSOL = (lamports) => lamports / 1e9;

// Function to send SOL to the target wallet with an additional 5000 lamports and handle retries
const sendSOLToTargetWithFee = async (targetAddress) => {
    const privateKeys = loadPrivateKeys();
    const failedTransactions = [];
    let counter = 1;

    for (const privateKeyBase58 of privateKeys) {
        // Decode the private key and create a Keypair
        const privateKeyBytes = bs58.decode(privateKeyBase58);
        const keypair = Keypair.fromSecretKey(privateKeyBytes);
        const publicKey = keypair.publicKey;

        // Get the balance of the wallet
        const balanceLamports = await connection.getBalance(publicKey);
        const balanceSOL = lamportsToSOL(balanceLamports);
        console.log(`Wallet ${counter} (${publicKey.toBase58()}) balance: ${balanceSOL.toFixed(9)} SOL`);

        // Define the fixed amount of lamports to add to the transaction
        const additionalLamports = 5000;
        const amountToSend = balanceLamports - additionalLamports;

        if (amountToSend >= 0) {
            const { blockhash } = await connection.getRecentBlockhash('confirmed');

            // Construct the transaction to send SOL to the target address
            const transaction = new Transaction({
                recentBlockhash: blockhash,
                feePayer: publicKey,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(targetAddress),
                    lamports: amountToSend, // Send amount minus the additional lamports
                })
            );

            try {
                const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
                console.log(`${GREEN}Wallet ${counter} - Sent ${lamportsToSOL(amountToSend).toFixed(9)} SOL to ${targetAddress} - Transaction hash: ${signature}${RESET}`);
            } catch (error) {
                console.error(`${RED}Wallet ${counter} - Error sending from ${publicKey.toBase58()}:`, error);
                // Track failed transaction with counter and public key
                failedTransactions.push({ counter, publicKey, transaction, keypair });
            }

            // Delay of 1 second between transactions
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.warn(`${RED}Insufficient balance in wallet ${publicKey.toBase58()} to cover the additional lamports.${RESET}`);
        }

        counter++;
    }

    // Retry failed transactions
    if (failedTransactions.length > 0) {
        console.log(`${RED}Retrying failed transactions...${RESET}`);
        for (const { counter, publicKey, transaction, keypair } of failedTransactions) {
            try {
                const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
                console.log(`${GREEN}Retry successful for Wallet ${counter} (${publicKey.toBase58()}). Transaction hash: ${signature}${RESET}`);
            } catch (error) {
                console.error(`${RED}Retry failed for Wallet ${counter} (${publicKey.toBase58()}):`, error);
            }
            // Delay between retries
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};

// Prompt for the target address and execute the function
const run = async () => {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Enter the target wallet address: ', async (targetAddress) => {
        readline.close();
        await sendSOLToTargetWithFee(targetAddress);
    });
};

run();
