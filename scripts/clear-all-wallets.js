const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes
const RED_BOLD = '\x1b[1;31m';
const GREEN_BOLD = '\x1b[1;32m';
const NC = '\x1b[0m'; // No Color

// Paths
const walletsDir = './wallets';
const privatesFile = 'privates.txt';
const publicsFile = 'publics.txt';
const backupRootDir = './backup';

// Function to generate a unique backup directory name inside the backup root folder
const generateBackupDir = () => {
    let counter = 1;
    let backupDir;

    do {
        backupDir = path.join(backupRootDir, `backup${counter}`);
        counter++;
    } while (fs.existsSync(backupDir));

    return backupDir;
};

// Function to move a directory or file to the backup directory
const moveToBackup = (srcPath, backupDir) => {
    const destPath = path.join(backupDir, path.basename(srcPath));
    fs.rename(srcPath, destPath, (err) => {
        if (err) {
            console.error(`Error moving ${srcPath} to backup:`, err);
        }
    });
};

// Function to prompt the user for confirmation
const promptUser = (question) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

// Main function to execute the backup operation
const main = async () => {
    const answer = await promptUser(`Type ${RED_BOLD}clear-all-wallets${NC} to confirm: `);

    if (answer === 'clear-all-wallets') {
        // Ensure the backup root directory exists
        if (!fs.existsSync(backupRootDir)) {
            fs.mkdirSync(backupRootDir);
        }

        // Generate a unique backup directory inside the backup root directory
        const backupDir = generateBackupDir();

        // Create the backup directory
        fs.mkdirSync(backupDir);

        // Move the wallets directory, privates.txt, and publics.txt to the backup directory
        if (fs.existsSync(walletsDir)) {
            moveToBackup(walletsDir, backupDir);
        }

        if (fs.existsSync(privatesFile)) {
            moveToBackup(privatesFile, backupDir);
        }

        if (fs.existsSync(publicsFile)) {
            moveToBackup(publicsFile, backupDir);
        }

        console.log(`${GREEN_BOLD}All wallets moved to backup${NC}`);
    } else {
        console.log('Operation cancelled.');
    }
};

main();
