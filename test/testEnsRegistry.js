const ENSRegistry = artifacts.require('ENSRegistry');
const exceptions = require("./exceptions.js");
const namehash = require('eth-ens-namehash');

contract('ENSRegistry', function (accounts) {

  const deployer = accounts[0];
  const resolver = accounts[1];
  const bob = accounts[2];

  let registryInstance;
  const initialNode = '0x00';

  const tld = 'eth';
  const tldLabel = web3.utils.keccak256(tld);
  const tldNamehash = namehash.hash(tld);

  const subdomain = 'test'
  const subdomainLabel = web3.utils.keccak256(subdomain);
  const subdomainNamehash = namehash.hash(`${subdomain}.${tld}`);

  const label = '0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0';
  const ttl = 5;

  before(async function() {
      registryInstance = await ENSRegistry.new();
  });

  it('should set the deployer as owner of 0x0', async function () {
    assert.equal(await registryInstance.owner(initialNode), deployer);
  });

  it('should have initial ttl 0', async function () {
    assert.equal(0, await registryInstance.ttl(initialNode));
  });

  it('should allow to set ttl', async function () {
    await registryInstance.setTTL(initialNode, ttl);
    storedTtl = await registryInstance.ttl(initialNode);
    assert.equal(ttl, storedTtl);
  });

  it('should allow to set resolver', async function () {
    await registryInstance.setResolver(initialNode, resolver);
    assert.equal(resolver, await registryInstance.resolver(initialNode));
  });

  it('should allow to set owner', async function () {
    await registryInstance.setOwner(initialNode, bob);
    assert.equal(bob, await registryInstance.owner(initialNode));
  });

  it('should not allow to act without being owner', async function () {
    await exceptions.catchRevert(registryInstance.setOwner(initialNode, deployer));
    await exceptions.catchRevert(registryInstance.setResolver(initialNode, deployer));
    await exceptions.catchRevert(registryInstance.setSubnodeOwner(initialNode, label, deployer));
    await exceptions.catchRevert(registryInstance.setTTL(initialNode, ttl));
  });

  it('should allow owner to setSubnodeOwner', async function () {
    await registryInstance.setSubnodeOwner(initialNode, tldLabel, resolver, {from: bob});
    assert.equal(await registryInstance.owner(tldNamehash), resolver);
  });

  it('should allow owner to setSubnodeOwner one level deeper', async function () {
    await registryInstance.setSubnodeOwner(tldNamehash, subdomainLabel, resolver, {from: resolver});
    assert.equal(await registryInstance.owner(subdomainNamehash), resolver);
  });
})
