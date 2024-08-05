const solanaWeb3 = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, TokenAccountNotFoundError } = require('@solana/spl-token');
const bs58 = require('bs58');
const fs = require('fs');

// Read the RPC URL from rpc.txt
const rpcUrl = fs.readFileSync('rpc.txt', 'utf8').trim();

// Create a connection to the Solana cluster
const connection = new solanaWeb3.Connection(rpcUrl, 'confirmed');

// Define the token contract address
const tokenMintAddress = new solanaWeb3.PublicKey('oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp');

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

// Function to create a token account for a given wallet
const createTokenAccount = async (wallet) => {
    try {
        // Get or create associated token account
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            tokenMintAddress,
            wallet.publicKey
        );

        return fromTokenAccount.address.toBase58();
    } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
            console.error(`\x1b[31mToken account not found, retrying for wallet ${wallet.publicKey.toBase58()}:\x1b[0m`, error);
            return await createTokenAccount(wallet); // Retry on TokenAccountNotFoundError
        } else {
            console.error(`\x1b[31mFailed to create token account for wallet ${wallet.publicKey.toBase58()}:\x1b[0m`, error);
            return null;
        }
    }
};

const main = async () => {
    const privateKeys = loadPrivateKeys();
    
    if (privateKeys.length === 0) {
        console.error(`\x1b[31mNo private keys found in privates.txt\x1b[0m`);
        return;
    }

    const wallets = privateKeys.map((key, index) => {
        try {
            const keyArray = bs58.decode(key);
            return { wallet: solanaWeb3.Keypair.fromSecretKey(keyArray), index: index + 1 };
        } catch (error) {
            console.error(`\x1b[31mInvalid secret key: ${key}\x1b[0m`);
            return null;
        }
    }).filter(item => item !== null);

    // Fetch token mint details once
    const tokenMintInfo = await connection.getParsedAccountInfo(tokenMintAddress);
    const decimals = tokenMintInfo.value.data.parsed.info.decimals;

    for (const { wallet, index } of wallets) {
        try {
            const tokenAccountAddress = await createTokenAccount(wallet);
            if (tokenAccountAddress) {
                console.log(`\x1b[32m${index}. ${wallet.publicKey.toBase58()}: ${tokenAccountAddress}\x1b[0m`);
            }
        } catch (error) {
            console.error(`\x1b[31mError creating token account for wallet ${wallet.publicKey.toBase58()}: ${error}\x1b[0m`);
        }
    }
};

main().catch(err => {
    console.error(`\x1b[31mError in main function:\x1b[0m`, err);
});
