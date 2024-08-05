import os
import shutil
import json
import subprocess
from base58 import b58encode
from solders.keypair import Keypair
from solders.pubkey import Pubkey

# ANSI escape codes for green text
GREEN = "\033[92m"
RESET = "\033[0m"

def move_to_backup():
    backup_dir = "./backup"
    if not os.path.exists(backup_dir):
        os.mkdir(backup_dir)
    
    # Find the next available backup folder number
    backup_num = 1
    while os.path.exists(os.path.join(backup_dir, f"backup{backup_num}")):
        backup_num += 1
    new_backup_dir = os.path.join(backup_dir, f"backup{backup_num}")
    os.mkdir(new_backup_dir)

    # Move files and folders to the new backup directory
    if os.path.exists("privates.txt"):
        shutil.move("privates.txt", new_backup_dir)
    if os.path.exists("publics.txt"):
        shutil.move("publics.txt", new_backup_dir)
    if os.path.exists("./wallets"):
        shutil.move("./wallets", new_backup_dir)
    
    print(f"{GREEN}Moved existing files to {new_backup_dir}{RESET}")

def generate_wallets(num_wallets):
    # Ensure the wallets directory exists
    if not os.path.exists("./wallets"):
        os.mkdir("./wallets")
    
    # Open the files to write Base58-encoded private keys and public addresses
    with open("privates.txt", "w") as private_file, open("publics.txt", "w") as public_file:
        for i in range(1, num_wallets + 1):
            # Generate a new keypair using solana-keygen with --force flag
            try:
                result = subprocess.run(
                    ["solana-keygen", "new", "--outfile", f"wallets/{i}.json", "--no-bip39-passphrase", "--force"],
                    capture_output=True,
                    text=True,
                    check=True
                )
            except subprocess.CalledProcessError as e:
                print(f"{GREEN}Failed to generate wallet {i}: {e.stderr}{RESET}")
                continue
            
            # Extract the private key and public address from the generated JSON file
            file_path = os.path.join("./wallets", f"{i}.json")
            try:
                with open(file_path, "r") as json_file:
                    keypair_data = json.load(json_file)
                
                # Handle case where data is a list
                if isinstance(keypair_data, list) and len(keypair_data) == 64:
                    private_key_bytes = bytes(keypair_data)
                elif isinstance(keypair_data, dict):
                    # Extract the private key (assuming it's in the 'secret_key' field)
                    secret_key = keypair_data.get("secret_key")
                    if isinstance(secret_key, list) and len(secret_key) == 64:
                        private_key_bytes = bytes(secret_key)
                    else:
                        raise ValueError(f"Invalid private key data in {file_path}")
                else:
                    raise ValueError(f"Unexpected data format in {file_path}")
                
                # Base58 encode the private key
                base58_encoded_key = b58encode(private_key_bytes).decode('utf-8')
                private_file.write(base58_encoded_key + "\n")
                
                # Extract the first 32 bytes and convert to public key
                keypair = Keypair.from_seed(private_key_bytes[:32])
                public_key = keypair.pubkey()
                
                # Convert public key to Base58 string
                public_key_str = str(public_key)
                public_file.write(public_key_str + "\n")
                
            except Exception as e:
                print(f"{GREEN}Failed to process {file_path}: {e}{RESET}")

    print(f"{GREEN}Base58-encoded private keys saved to privates.txt{RESET}")
    print(f"{GREEN}Public addresses saved to publics.txt{RESET}")

if __name__ == "__main__":
    move_to_backup()
    num_wallets = int(input("How many wallets do you want to create? "))
    generate_wallets(num_wallets)
