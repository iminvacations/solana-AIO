
# Links

[Repositório original Ore](https://github.com/regolith-labs/ore)

[Repositório Ore do LumenDAO](https://github.com/lumendao-projects/ore)

# Instalações

### build-essential
```sh
sudo apt update
sudo apt install build-essential
```

### rustup
```sh
curl https://sh.rustup.rs -sSf | sh
```
<p style="color:red;">PRECISA EXECUTAR O(S) COMANDO(S) GERADO(S) NO TERMINAL </p>


### dependencias do python
```sh
pip install base58
pip install solders
```


### solana-keygen
```sh
rm -rf $HOME/.local/share/solana
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
```
<p style="color:red;">PRECISA EXECUTAR O(S) COMANDO(S) GERADO(S) NO TERMINAL </p>


### nvm:
```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
nvm install 20
```

### Dependências Node
```sh
npm install
npm i -g pm2
```
