const solanaWeb3 = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, createTransferCheckedInstruction } = require('@solana/spl-token');
const fs = require('fs');
const readline = require('readline');

// Configuration values
const COMPUTE_UNITS = 100000; // Set compute unit limit
const MICRO_LAMPORTS = 300000; // Set priority fee (1 microLamport per compute unit)
const PARALLEL_TRANSACTIONS = 1; // Number of parallel transactions
const TOKEN_ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // Replace with your SPL token address

// Load the sender's keypair
const senderKeypair = solanaWeb3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('./wallets/1.json', 'utf8')))
);

// RPC URL from file
const rpcUrl = fs.readFileSync('rpc.txt', 'utf8').trim();
const connection = new solanaWeb3.Connection(rpcUrl, 'confirmed');

const recipientAddresses = fs.readFileSync('publics.txt', 'utf8').split('\n').filter(Boolean);

function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function main() {
    const amount = parseFloat(await prompt("Enter the amount of SPL tokens to transfer: "));
    if (isNaN(amount)) {
        console.error("Invalid amount.");
        return;
    }

    const tokenMintAddress = new solanaWeb3.PublicKey(TOKEN_ADDRESS);

    // Fetch token mint details
    const tokenMintInfo = await connection.getParsedAccountInfo(tokenMintAddress);
    const decimals = tokenMintInfo.value.data.parsed.info.decimals;

    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        tokenMintAddress,
        senderKeypair.publicKey
    );

    let counter = 1;

    for (let i = 0; i < recipientAddresses.length; i += PARALLEL_TRANSACTIONS) {
        const chunk = recipientAddresses.slice(i, i + PARALLEL_TRANSACTIONS);
        const results = await Promise.all(chunk.map(async (address, index) => {
            const recipientIndex = i + index;
            const recipientPublicKey = new solanaWeb3.PublicKey(address);
            const toTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                senderKeypair,
                tokenMintAddress,
                recipientPublicKey
            );

            const transaction = new solanaWeb3.Transaction();
            const signers = [senderKeypair];

            // Add compute units and priority fee instructions
            transaction.add(
                solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNITS }),
                solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: MICRO_LAMPORTS }),
                createTransferCheckedInstruction(
                    fromTokenAccount.address, // Sender token account
                    tokenMintAddress, // Token mint address
                    toTokenAccount.address, // Recipient token account
                    senderKeypair.publicKey, // Owner of the sender account
                    amount * (10 ** decimals), // Amount in smallest unit
                    decimals, // Token decimal places
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            const { blockhash } = await connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = senderKeypair.publicKey;

            try {
                const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, signers);
                return `\x1b[32m${recipientIndex + 1}. ${address} - Transaction sent with hash: ${signature}\x1b[0m`;
            } catch (error) {
                return `\x1b[31m${recipientIndex + 1}. ${address} failed: ${error.message}\x1b[0m`;
            }
        }));

        // Print the results after processing each chunk
        results.forEach(result => console.log(result));
    }
}

main().catch(err => console.error(`Error: ${err.message}`));
