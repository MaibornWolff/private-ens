var ENS = artifacts.require("@ensdomains/ens/ENSRegistry");
var FIFSRegistrar = artifacts.require("@ensdomains/ens/FIFSRegistrar");
var PublicResolver = artifacts.require("@ensdomains/resolver/PublicResolver");

const web3 = new (require('web3'))();
const namehash = require('eth-ens-namehash');


module.exports = function(deployer, network) {
  let tld = 'example';
  let ensInstance, registrarInstance;
  const tldNode = namehash.hash(tld);
  const tldLabelhash = web3.utils.sha3(tld);

  // Step 1: deploy the registry
  deployer.deploy(ENS)
  .then(function(instance) {
    ensInstance = instance;
    // Step 2: deploy the registrar
    return deployer.deploy(FIFSRegistrar, ensInstance.address, tldNode);
  }).then(function(instance) {
    console.log(`Registrar administers '${tld}' (node '${tldNode}')`)
    registrarInstance = instance;
    // Step 3: make registrar owner of the tld
    return ensInstance.setSubnodeOwner('0x0', tldLabelhash, registrarInstance.address);
  }).then(function(receipt) {
    console.log(`Registrar is now owner of '${tld}' (label '${tldLabelhash}') in the registry`)
    // Step 4: deploy resolver
    return deployer.deploy(PublicResolver, ensInstance.address);
  })
};
