const bs58 = require('bs58');
const fs = require('fs');
const solanaWeb3 = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, createTransferCheckedInstruction } = require('@solana/spl-token');
const readline = require('readline');

// Configuration values
const COMPUTE_UNITS = 100000; // Set compute unit limit
const MICRO_LAMPORTS = 300000; // Set priority fee (1 microLamport per compute unit)
const TOKEN_ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // Replace with your SPL token address

// Read the RPC URL from rpc.txt
const rpcUrl = fs.readFileSync('rpc.txt', 'utf8').trim();
const connection = new solanaWeb3.Connection(rpcUrl, 'confirmed');

// Load the list of private keys from the privates.txt file
const loadPrivateKeys = () => {
    try {
        const data = fs.readFileSync('privates.txt', 'utf8');
        return data.trim().split('\n').map(key => key.trim());
    } catch (error) {
        console.error(`\x1b[31mError reading privates.txt file:\x1b[0m`, error);
        return [];
    }
};

// Prompt for user input
function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function main() {
    const targetAddress = await prompt("Enter the target wallet address: ");
    const recipientPublicKey = new solanaWeb3.PublicKey(targetAddress);

    const tokenMintAddress = new solanaWeb3.PublicKey(TOKEN_ADDRESS);

    // Fetch token mint details
    const tokenMintInfo = await connection.getParsedAccountInfo(tokenMintAddress);
    const decimals = tokenMintInfo.value.data.parsed.info.decimals;

    const privateKeys = loadPrivateKeys();
    const failedTransactions = [];
    let counter = 1;

    for (const privateKeyBase58 of privateKeys) {
        // Decode the private key and create a Keypair
        const privateKeyBytes = bs58.decode(privateKeyBase58);
        const keypair = solanaWeb3.Keypair.fromSecretKey(privateKeyBytes);
        const publicKey = keypair.publicKey;

        // Get the associated token account for the sender
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            tokenMintAddress,
            publicKey
        );

        // Get the balance of the token account
        const balanceInfo = await connection.getTokenAccountBalance(fromTokenAccount.address);
        const balanceAmount = parseFloat(balanceInfo.value.amount);

        console.log(`Wallet ${counter} (${publicKey.toBase58()}) balance: ${balanceAmount / (10 ** decimals)} SPL tokens`);

        if (balanceAmount > 0) {
            // Get the associated token account for the recipient
            const toTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                keypair,
                tokenMintAddress,
                recipientPublicKey
            );

            const transaction = new solanaWeb3.Transaction();
            const signers = [keypair];

            // Add compute units and priority fee instructions
            transaction.add(
                solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNITS }),
                solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: MICRO_LAMPORTS }),
                createTransferCheckedInstruction(
                    fromTokenAccount.address, // Sender token account
                    tokenMintAddress, // Token mint address
                    toTokenAccount.address, // Recipient token account
                    keypair.publicKey, // Owner of the sender account
                    balanceAmount, // Amount in smallest unit
                    decimals, // Token decimal places
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            const { blockhash } = await connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = keypair.publicKey;

            try {
                const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, signers);
                console.log(`\x1b[32mWallet ${counter} - Sent ${balanceAmount / (10 ** decimals)} SPL tokens to ${targetAddress} - Transaction hash: ${signature}\x1b[0m`);
            } catch (error) {
                console.error(`\x1b[31mWallet ${counter} - Error sending from ${publicKey.toBase58()}:`, error);
                // Track failed transaction with counter and public key
                failedTransactions.push({ counter, publicKey, transaction, keypair });
            }
        } else {
            console.log(`\x1b[31mWallet ${counter} (${publicKey.toBase58()}) has no tokens to send.\x1b[0m`);
        }

        counter++;
    }

    // Retry failed transactions
    if (failedTransactions.length > 0) {
        console.log(`\x1b[31mRetrying failed transactions...\x1b[0m`);
        for (const { counter, publicKey, transaction, keypair } of failedTransactions) {
            try {
                const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [keypair]);
                console.log(`\x1b[32mRetry successful for Wallet ${counter} (${publicKey.toBase58()}). Transaction hash: ${signature}\x1b[0m`);
            } catch (error) {
                console.error(`\x1b[31mRetry failed for Wallet ${counter} (${publicKey.toBase58()}):`, error);
            }
            // Delay between retries
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

main().catch(err => console.error(`Error: ${err.message}`));
