const fs = require('fs');
const readline = require('readline');

// Function to prompt user for input
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function main() {
    // Ask for inputs
    const numWallets = await askQuestion('How many wallets? ');
    const numRPCs = await askQuestion('How many RPCs do you want? ');
    const numThreads = await askQuestion('How many threads? ');
    const priorityFee = await askQuestion('What is the priority fee? ');

    // Read RPCs from file
    const rpcLines = fs.readFileSync('./ore/rpcs.txt', 'utf-8').split('\n').filter(Boolean);

    // Check if there are enough RPCs
    if (rpcLines.length < numRPCs) {
        console.error('\x1b[31m%s\x1b[0m', 'Error: Not enough RPCs in rpcs.txt');
        return;
    }

    // Calculate wallets per RPC
    const walletsPerRPC = Math.ceil(numWallets / numRPCs);

    // Create PM2 config array
    const pm2Config = { apps: [] };

    for (let i = 0; i < numWallets; i++) {
        const rpcIndex = Math.floor(i / walletsPerRPC);
        const rpc = rpcLines[rpcIndex % rpcLines.length];
        const walletIndex = i + 1;

        pm2Config.apps.push({
            name: `${walletIndex}`,
            script: "./ore/ore",
            args: `--rpc ${rpc} --keypair ./wallets/${walletIndex}.json --priority-fee ${priorityFee} mine --threads ${numThreads}`
        });
    }

    // Write PM2 config to pm2.json
    fs.writeFileSync('./ore/pm2.json', JSON.stringify(pm2Config, null, 2));

    // Print success message in green
    console.log('\x1b[32m%s\x1b[0m', 'pm2.json has been created successfully!');
}

main();
