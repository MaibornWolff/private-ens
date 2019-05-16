const ENS = artifacts.require("ENSRegistry.sol");
const FIFSRegistrar = artifacts.require('FIFSRegistrar.sol');
const PublicResolver = artifacts.require('PublicResolver.sol');

const web3 = new (require('web3'))();
const namehash = require('eth-ens-namehash');


/**
 * Calculate root node hashes given the top level domain(tld)
 *
 * @param {string} tld plain text tld, for example: 'eth'
 */
function getRootNodeFromTLD(tld) {
  return {
    namehash: namehash.hash(tld),
    sha3: web3.sha3(tld)
  };
}

/**
 * Deploy the ENS, FIFSRegistrar, and public resolver
 *
 * @param {Object} deployer truffle deployer helper
 * @param {string} tld tld which the FIFS registrar takes charge of
 */
async function deployFIFSRegistrarAndPublicResolver(deployer, tld) {
  var rootNode = getRootNodeFromTLD(tld);

  let ensInstance, registrarInstance;
  deployer.deploy(ENS)
  .then(function(instance) {
    ensInstance = instance;
    return deployer.deploy(FIFSRegistrar, ensInstance.address, rootNode.namehash);
  }).then(function(instance) {
    registrarInstance = instance;
    return ensInstance.setSubnodeOwner('0x0', rootNode.sha3, registrarInstance.address);
  }).then(function(receipt) {
    console.log(`ENS Registry and registrar status: ${receipt.receipt.status}`)
    return deployer.deploy(PublicResolver, ensInstance.address);
  })
}

module.exports = function(deployer, network) {
  var tld = 'eth';
  deployFIFSRegistrarAndPublicResolver(deployer, tld);
};
