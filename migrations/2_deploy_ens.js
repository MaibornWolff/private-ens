const ENS = artifacts.require("ENSRegistry.sol");
const FIFSRegistrar = artifacts.require('FIFSRegistrar.sol');
const PublicResolver = artifacts.require('PublicResolver.sol');

const web3 = new (require('web3'))();
const namehash = require('eth-ens-namehash');


module.exports = function(deployer, network) {
  let tld = 'eth';
  let ensInstance, registrarInstance;

  // Step 1: deploy the registry
  deployer.deploy(ENS)
  .then(function(instance) {
    ensInstance = instance;
    // Step 2: deploy the registrar
    return deployer.deploy(FIFSRegistrar, ensInstance.address, namehash.hash(tld));
  }).then(function(instance) {
    registrarInstance = instance;
    // Step 3: make registrar owner of 'eth'
    return ensInstance.setSubnodeOwner('0x0', web3.sha3(tld), registrarInstance.address);
  }).then(function(receipt) {
    // Step 4: deploy resolver
    return deployer.deploy(PublicResolver, ensInstance.address);
  })
};
