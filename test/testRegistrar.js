const ENSRegistry = artifacts.require('ENSRegistry');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');

const exceptions = require("./exceptions.js");
const namehash = require('eth-ens-namehash');

contract('FIFSRegistrar', function (accounts) {

  const deployer = accounts[0];
  const bob = accounts[1];

  let registryInstance;
  let registrarInstance;
  const initialNode = '0x00';

  const tld = 'eth';
  const tldLabel = web3.utils.keccak256(tld);
  const tldNamehash = namehash.hash(tld);

  const subdomain = 'test'
  const subdomainLabel = web3.utils.keccak256(subdomain);
  const subdomainNamehash = namehash.hash(`${subdomain}.${tld}`);

  before(async function() {
      registryInstance = await ENSRegistry.new();
      registrarInstance = await FIFSRegistrar.new(registryInstance.address, tldNamehash);
      await registryInstance.setSubnodeOwner(initialNode, tldLabel, registrarInstance.address);
  });

  it('should have set the registrar as the owner of the eth node', async function () {
    assert.equal(await registryInstance.owner(tldNamehash), registrarInstance.address);
  });

  it('should allow bob to register a subdomain', async function () {
    await registrarInstance.register(subdomainLabel, bob, {from: bob});
    assert.equal(await registryInstance.owner(subdomainNamehash), bob);
  });

  it('should not allow register an already owned subdomain', async function () {
    await exceptions.catchRevert(registrarInstance.register(subdomainLabel, deployer, {from: deployer}));
  });
})
