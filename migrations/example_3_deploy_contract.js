// Example of how the ENSHelper can be used to register/update a domain and store a contract address/abi
const Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const ENSArtifacts = {
  registry: artifacts.require("ENSRegistry.sol"),
  registrar: artifacts.require('FIFSRegistrar.sol'),
  resolver: artifacts.require('PublicResolver.sol')
}

const MyContract = artifacts.require("MyContract.sol");

const name = "mycontract";
const tld = "example";
const registerLabelAndStoreAddressAndAbi = require("./ENSHelper");

module.exports = function(deployer, network) {

  deployer.deploy(MyContract)
  .then(async function() {
    await registerLabelAndStoreAddressAndAbi(ENSArtifacts, MyContract, web3, name, tld);
  })
};
