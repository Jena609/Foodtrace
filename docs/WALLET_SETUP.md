# Wallet setup

FoodTrace signs Studio Next transactions with the connected browser wallet. The GenLayer CLI account is a separate signer used for command-line deployment. Neither path asks the application to store a private key, seed phrase, or password.

## Browser wallet

1. Install an injected EVM wallet, such as MetaMask, Rabby, Coinbase Wallet, OKX Wallet, Trust Wallet, or Brave Wallet.
2. Open http://localhost:3460/lookup.
3. Connect the wallet. FoodTrace reads the account and chain id.
4. If the chain is not `61997`, switch to GenLayer Studio Next. The RPC is `https://studio-dev.genlayer.com/api`.
5. Fund that account from the water-drop control in https://studio-dev.genlayer.com.
6. Return to the result page and review the evidence before choosing Verify with GenLayer.

WalletConnect is available only after `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set. An empty project id leaves the injected-wallet path active.

## What the screen can show

- Wallet not connected
- Wrong network
- Signature rejected
- Account changed
- Chain changed
- Insufficient Studio Next funds
- Pending transaction hash
- GenLayer decision and finalization status

A rejected signature does not create a transaction hash. A wrong network does not submit the verification.

## Command-line signer

The local GenLayer CLI account is named `default`. Its address is `0x5F85c75F8442b92ba66C30371CEf6cF3D7B4c650`. Lock status means the key is not cached in the operating-system keychain. A command can still sign when the password is entered in that terminal. Do not paste the password into the application or into a chat.

Unlock it locally from the FoodTrace directory:

```bash
node .\node_modules\genlayer\dist\index.js account unlock --account default
```

The saved CLI network on this computer may still be `studionet`. FoodTrace reads and sends Studio Next transactions through `https://studio-dev.genlayer.com/api`. Do not point FoodTrace at Studionet.
