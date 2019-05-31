# Deploy and Use the Ethereum Name Service on a Private Chain
ENS is a set of smart contracts which enables users to assign additional information, most importantly human-readable names, to Ethereum accounts.
ENS has many uses on the main chain (you can check [the official introduction](https://docs.ens.domains/) if you don't know about them!) and is [with over a transaction a minute](https://etherscan.io/address/0x6090a6e47849629b7245dfa1ca21d94cd15878ef) on average since its inception two years ago [one of the most used](https://blockspur.com/ethereum_contracts/transactions) pieces of on-chain infrastructure.
Naturally, you may want to set it up on your private network as well.
However instructions on how to set up ENS from scratch have to be pieced together from various repositories and sources.
This truffle project bundles the official ENS contracts ([@ensdomains/ens](https://github.com/ensdomains/ens), [@ensdomains/resolver](https://github.com/ensdomains/resolvers) on github) and provides several scripts and pieces of code that tie everything together to make getting started and working with ENS on a private network easier.

This repo stores the code referred to by [this tutorial](https://kauri.io/article/30ed03248cc2432ba5565375c4413608/ethereum-name-service-on-private-chains) where you will find detailed instructions on how to use it.
