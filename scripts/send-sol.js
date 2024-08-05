const solanaWeb3 = require('@solana/web3.js');
const { ComputeBudgetProgram, SystemProgram, Transaction } = solanaWeb3;
const fs = require('fs');
const readline = require('readline');

// Configuration values
const COMPUTE_UNITS = 100000; // Set compute unit limit
const MICRO_LAMPORTS = 300000; // Set priority fee (1 microLamport per compute unit)
const PARALLEL_TRANSACTIONS = 6; // Number of parallel transactions

// Load the sender's keypair from a JSON file
const senderKeypair = solanaWeb3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('./wallets/1.json', 'utf8')))
);

// Specify the RPC URL directly in the code
const rpcUrl = fs.readFileSync('rpc.txt', 'utf8').trim();

// Initialize connection
const connection = new solanaWeb3.Connection(rpcUrl);

// Read recipient addresses from file
const recipientAddresses = fs.readFileSync('publics.txt', 'utf8').split('\n').filter(Boolean);

// Create a readline interface to ask for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to ask for user input
function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

(async () => {
    // Ask for the amount to transfer in SOL
    const amountInSOL = await askQuestion('Enter the amount to transfer (in SOL): ');
    rl.close();

    // Convert the amount to lamports (1 SOL = 1,000,000,000 lamports)
    const amount = parseFloat(amountInSOL) * solanaWeb3.LAMPORTS_PER_SOL;

    let counter = 1; // Initialize counter

    for (let i = 0; i < recipientAddresses.length; i += PARALLEL_TRANSACTIONS) {
        const chunk = recipientAddresses.slice(i, i + PARALLEL_TRANSACTIONS);
        const results = [];

        await Promise.all(chunk.map(async (address, index) => {
            let confirmed = false;
            while (!confirmed) {
                try {
                    const recipientPublicKey = new solanaWeb3.PublicKey(address);

                    // Fetch recent blockhash
                    const { blockhash } = await connection.getRecentBlockhash();

                    // Create a transaction
                    const transaction = new Transaction({
                        recentBlockhash: blockhash,
                        feePayer: senderKeypair.publicKey,
                    });

                    // Add compute units and priority fee instructions
                    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ 
                        units: COMPUTE_UNITS 
                    });

                    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({ 
                        microLamports: MICRO_LAMPORTS 
                    });

                    // Add instructions to the transaction
                    transaction.add(
                        modifyComputeUnits,
                        addPriorityFee,
                        SystemProgram.transfer({
                            fromPubkey: senderKeypair.publicKey,
                            toPubkey: recipientPublicKey,
                            lamports: amount,
                        })
                    );

                    // Sign and send transaction
                    transaction.sign(senderKeypair);
                    const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [senderKeypair]);

                    // Store the result with the correct counter
                    results[index] = `\x1b[32m${counter + index}. ${address} - Transaction sent with hash: ${signature}\x1b[0m`;
                    confirmed = true;
                } catch (err) {
                    // Store the retry message with the correct counter
                    results[index] = `\x1b[33m${counter + index}. ${address} - Retrying...\x1b[0m`;
                    // Delay before retrying
                    await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay
                }
            }
        }));

        // Print results in order
        results.forEach(result => console.log(result));

        // Increment counter after handling each chunk of addresses
        counter += PARALLEL_TRANSACTIONS;
    }
})().catch(err => {
    console.error(`\x1b[31mError: ${err}\x1b[0m`);
});
