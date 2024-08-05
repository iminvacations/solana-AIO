const fs = require('fs');
const solanaWeb3 = require('@solana/web3.js');

// Read the RPC URL from rpc.txt
const rpcUrl = fs.readFileSync('rpc.txt', 'utf8').trim();
const connection = new solanaWeb3.Connection(rpcUrl, 'confirmed');

// Read the list of public addresses from the publics.txt file
const loadPublicAddresses = () => {
    try {
        const data = fs.readFileSync('publics.txt', 'utf8');
        return data.trim().split('\n').map(address => address.trim());
    } catch (error) {
        console.error(`\x1b[31mError reading publics.txt file:\x1b[0m`, error);
        return [];
    }
};

// Log function to save output to a file (overwriting the file)
const logToFile = (message) => {
    fs.writeFileSync('balance-sol.txt', message, (err) => {
        if (err) throw err;
    });
};

async function main() {
    const publicAddresses = loadPublicAddresses();
    let counter = 1;
    let logContent = ''; // Initialize log content

    for (const address of publicAddresses) {
        try {
            const publicKey = new solanaWeb3.PublicKey(address);

            // Get the balance of the public address
            const balanceLamports = await connection.getBalance(publicKey);
            const balanceSOL = balanceLamports / solanaWeb3.LAMPORTS_PER_SOL;
            const balanceMessage = `${balanceSOL.toFixed(9)} SOL`;

            console.log(`Wallet ${counter} (${publicKey.toBase58()}) balance: ${balanceMessage}`);
            logContent += `${balanceMessage}\n`; // Append to log content
        } catch (error) {
            const errorMessage = `0 SOL`;
            console.error(`\x1b[31mWallet ${counter} (${address}) - Error retrieving balance:\x1b[0m ${error.message}`);
            logContent += `${errorMessage}\n`; // Append to log content
        }

        counter++;
    }

    logToFile(logContent); // Write all log content at once
}

main().catch(err => {
    const errorMessage = `Error: ${err.message}`;
    console.error(errorMessage);
    logToFile(`0 SOL\n`); // Ensure to log the error
});
