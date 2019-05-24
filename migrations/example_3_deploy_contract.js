// Example of how the ENSHelper can be used to register/update a domain and store a contract address/abi
const Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const ENSArtifacts = {
  registry: artifacts.require("ENSRegistry.sol"),
  registrar: artifacts.require('FIFSRegistrar.sol'),
  resolver: artifacts.require('PublicResolver.sol')
}

const Test = artifacts.require("Test.sol");

const name = "test";
const registerLabelAndStoreAddressAndAbi = require("./ENSHelper");

module.exports = function(deployer, network) {

  deployer.deploy(Test)
  .then(async function() {
    await registerLabelAndStoreAddressAndAbi(ENSArtifacts, Test, web3, name);
  })
};
