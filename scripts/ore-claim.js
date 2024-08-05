const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const PARALLEL_TRANSACTIONS = 2;  // Number of parallel transactions

function parseInput(input) {
  let wallets = [];
  input.split(',').forEach(part => {
    if (part.includes('-')) {
      let [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        wallets.push(i);
      }
    } else {
      wallets.push(Number(part));
    }
  });
  return wallets;
}

function runCommand(wallet, rpcUrl, priorityFee, counter) {
  const command = `./ore/ore`;
  const args = [`--rpc`, rpcUrl, `--keypair`, `./wallets/${wallet}.json`, `--priority-fee`, priorityFee, `claim`];

  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let output = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('You are about to claim')) {
        const match = output.match(/You are about to claim [\d.]+ ORE\./);
        if (match) {
          console.log(`${counter}. ${match[0]}`);
          process.stdin.write('y\n');
        }
      }
    });

    process.stderr.on('data', (data) => {
      console.error(`Stderr: ${data}`);
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

function runBatch(wallets, rpcUrl, priorityFee, batchSize) {
  let index = 0;
  let counter = 1;

  function nextBatch() {
    if (index >= wallets.length) {
      return Promise.resolve();
    }

    const batch = wallets.slice(index, index + batchSize);
    index += batchSize;

    return Promise.all(batch.map(wallet => runCommand(wallet, rpcUrl, priorityFee, counter++)))
      .then(nextBatch)
      .catch(error => {
        console.error(`Batch error: ${error.message}`);
        // Continue with next batch even if there is an error
        return nextBatch();
      });
  }

  return nextBatch();
}

fs.readFile('rpc.txt', 'utf8', (err, rpcUrl) => {
  if (err) {
    console.error(`Error reading rpc.txt: ${err.message}`);
    process.exit(1);
  }

  rl.question('Enter wallet numbers (e.g., 1-4,8,9): ', (walletsInput) => {
    rl.question('Enter priority fee: ', (priorityFee) => {
      const wallets = parseInput(walletsInput);
      runBatch(wallets, rpcUrl.trim(), priorityFee, PARALLEL_TRANSACTIONS)
        .then(() => {
          console.log('\x1b[32mAll transactions completed\x1b[0m');
        })
        .catch(error => console.error(`Error: ${error.message}`));
      rl.close();
    });
  });
});
