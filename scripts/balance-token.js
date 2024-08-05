const fs = require('fs');
const solanaWeb3 = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');

// Configuration values
const TOKEN_ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // Replace with your SPL token address

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
    fs.writeFileSync('balance-token.txt', message, (err) => {
        if (err) throw err;
    });
};

async function main() {
    const tokenMintAddress = new solanaWeb3.PublicKey(TOKEN_ADDRESS);

    // Fetch token mint details
    const tokenMintInfo = await connection.getParsedAccountInfo(tokenMintAddress);
    const decimals = tokenMintInfo.value.data.parsed.info.decimals;

    const publicAddresses = loadPublicAddresses();
    let counter = 1;
    let logContent = ''; // Initialize log content

    for (const address of publicAddresses) {
        try {
            const publicKey = new solanaWeb3.PublicKey(address);

            // Get the associated token account for the public address
            const tokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                publicKey,
                tokenMintAddress,
                publicKey
            );

            // Get the balance of the token account
            const balanceInfo = await connection.getTokenAccountBalance(tokenAccount.address);
            const balanceAmount = parseFloat(balanceInfo.value.amount);
            const balanceMessage = `${balanceAmount / (10 ** decimals)} SPL tokens`;

            console.log(`Wallet ${counter} (${publicKey.toBase58()}) balance: ${balanceMessage}`);
            logContent += `${balanceMessage}\n`; // Append to log content
        } catch (error) {
            const errorMessage = `0 SPL tokens`;
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
    logToFile(`0 SPL tokens\n`); // Ensure to log the error
});
