#!/bin/bash


# Detecta o sistema operacional
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    python_cmd="python3"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    python_cmd="python3"
elif [[ "$OSTYPE" == "cygwin" ]]; then
    python_cmd="python"
elif [[ "$OSTYPE" == "msys" ]]; then
    python_cmd="python"
elif [[ "$OSTYPE" == "win32" ]]; then
    python_cmd="python"
else
    echo "Sistema operacional não suportado"
    exit 1
fi

scripts_dir="./scripts/"

# Define scripts (without .py or .js extension)
declare -a scripts=("send-sol" "send-token" "collect-sol" "collect-token" "balance-sol" "balance-token" "create-token-account" "ore-create-task" "ore-claim" "wallet-generator" "clear-all-wallets")
num_scripts=${#scripts[@]}

# ANSI color codes
PURPLE='\033[38;5;99m'
WHITE='\033[1;37m'
RED_BOLD='\033[1;31m'
GREEN_BOLD='\033[1;32m'
NC='\033[0m' # No Color

# Function to display menu
display_menu() {
    clear  # Clear screen

rpcs="./ore/rpcs.txt"

if [ ! -f "$rpcs" ]; then
    touch "$rpcs"
fi

rpc="rpc.txt"

if [ ! -f "$rpc" ]; then
    echo "https://api.mainnet-beta.solana.com" > "$rpc"
fi


    # Print title
    echo -e "${PURPLE}SOLANA${NC}"
    echo  # newline

    # Print menu options
    for ((i=0; i<num_scripts; i++)); do
        if [[ "${scripts[i]}" == "clear-all-wallets" ]]; then
            if [[ $i -eq $current ]]; then
                echo -e "${RED_BOLD}${scripts[i]}${NC}"  # Highlight selected option in bold red
            else
                echo "${scripts[i]}"  # Display in normal color
            fi
        elif [[ "${scripts[i]}" == "wallet-generator" ]]; then
            if [[ $i -eq $current ]]; then
                echo -e "${GREEN_BOLD}${scripts[i]}${NC}"  # Highlight selected option in bold green
            else
                echo "${scripts[i]}"  # Display in normal color
            fi
        else
            if [[ $i -eq $current ]]; then
                echo -e "${PURPLE}${scripts[i]}${NC}"  # Highlight selected option in purple
            else
                echo "${scripts[i]}"
            fi
        fi
    done
}

# Initial variables
current=0
choice=""

# Main loop
while true; do
    display_menu

    read -rsn1 choice
    case "$choice" in
        A|[aA]) # UP arrow key
            ((current--))
            [[ $current -lt 0 ]] && current=$(( num_scripts - 1 ))
            ;;
        B|[bB]) # DOWN arrow key
            ((current++))
            [[ $current -ge num_scripts ]] && current=0
            ;;
        "") # Enter key
            clear  # Clear screen
            script_name="${scripts[current]}"

            # Check if the script is Python or JavaScript
            if [[ -f "${scripts_dir}/${script_name}.py" ]]; then
                echo "Running ${script_name}.py..."
                $python_cmd "${scripts_dir}/${script_name}.py"
            elif [[ -f "${scripts_dir}/${script_name}.js" ]]; then
                echo "Running ${script_name}.js..."
                NODE_NO_WARNINGS=1 node "${scripts_dir}/${script_name}.js"
            else
                echo "Script ${script_name} not found"
            fi
            
            echo "Press any key to return to the menu"
            read -rsn1 -p ""
            ;;
        *) # Any other key
            echo "Invalid option"
            ;;
    esac
done
