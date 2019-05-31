const ENSRegistry = artifacts.require('ENSRegistry');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');
const PublicResolver = artifacts.require('PublicResolver');

const exceptions = require("./exceptions.js");
const namehash = require('eth-ens-namehash');

contract('PublicResolver', function (accounts) {

  const deployer = accounts[0];
  const bob = accounts[1];
  const someAddress = accounts[2];
  const someOtherAddress = accounts[3];

  let registryInstance;
  let registrarInstance;
  let resolverInstance;
  const initialNode = '0x00';

  const tld = 'example';
  const tldLabel = web3.utils.keccak256(tld);
  const tldNamehash = namehash.hash(tld);

  const subdomain = 'test'
  const subdomainLabel = web3.utils.keccak256(subdomain);
  const subdomainNamehash = namehash.hash(`${subdomain}.${tld}`);

  // Deep copy of the abi as it is modified during deployment
  const someAbi = JSON.parse(JSON.stringify(ENSRegistry.abi));

  before(async function() {
    // Deploy contracts
    registryInstance = await ENSRegistry.new();
    registrarInstance = await FIFSRegistrar.new(registryInstance.address, tldNamehash);
    await registryInstance.setSubnodeOwner(initialNode, tldLabel, registrarInstance.address);
    resolverInstance = await PublicResolver.new(registryInstance.address);
  });

  describe('supportsInterface function', async () => {

      it('supports known interfaces', async () => {
          assert.equal(await resolverInstance.supportsInterface("0x3b3b57de"), true);
          assert.equal(await resolverInstance.supportsInterface("0x691f3431"), true);
          assert.equal(await resolverInstance.supportsInterface("0x2203ab56"), true);
          assert.equal(await resolverInstance.supportsInterface("0xc8690233"), true);
          assert.equal(await resolverInstance.supportsInterface("0x59d1d43c"), true);
          assert.equal(await resolverInstance.supportsInterface("0xbc1c58d1"), true);
      });

      it('does not support a random interface', async () => {
          assert.equal(await resolverInstance.supportsInterface("0x3b3b57df"), false);
      });
  });

  it('allows bob to register a subdomain', async function () {
    await registrarInstance.register(subdomainLabel, bob, {from: bob});
    assert.equal(await registryInstance.owner(subdomainNamehash), bob);
  });


  it('permits setting address by owner', async () => {
      await resolverInstance.setAddr(subdomainNamehash, someAddress, {from: bob});
      assert.equal(await resolverInstance.addr(subdomainNamehash), someAddress);
  });

  it('can overwrite previously set address', async () => {
      await resolverInstance.setAddr(subdomainNamehash, someOtherAddress, {from: bob});
      assert.equal(await resolverInstance.addr(subdomainNamehash), someOtherAddress);
  });

  it('forbids setting new address by non-owners', async () => {
    await exceptions.catchRevert(resolverInstance.setAddr(subdomainNamehash, someAddress, {from: deployer}));
  });


  // 1	JSON
  const jsonCode = 0x1;
  // 2	zlib-compressed JSON
  // 4	CBOR
  // 8	URI
  describe('ABI', async () => {
      it('returns a contentType of 0 when nothing is available', async () => {
          let result = await resolverInstance.ABI(subdomainNamehash, 0xFFFFFFFF);
          assert.equal(result[0], 0);
      });

      it('returns an ABI after it has been set', async () => {
        const hexAbi = web3.utils.utf8ToHex(JSON.stringify(ENSRegistry.abi));
        await resolverInstance.setABI(subdomainNamehash, jsonCode, hexAbi, {from: bob})
        let result = await resolverInstance.ABI(subdomainNamehash, 0xFFFFFFFF);
        assert.equal(result[1], hexAbi);
        const storedAbi = JSON.parse(web3.utils.hexToUtf8(result[1]));
        assert.deepEqual([result[0].toNumber(), storedAbi], [jsonCode, someAbi]);
      });

      it('returns the first valid ABI', async () => {
          await resolverInstance.setABI(subdomainNamehash, jsonCode, "0x666f6f", {from: bob});
          await resolverInstance.setABI(subdomainNamehash, 0x4, "0x626172", {from: bob});

          let result = await resolverInstance.ABI(subdomainNamehash, 0x7);
          assert.deepEqual([result[0].toNumber(), result[1]], [1, "0x666f6f"]);
      });

      it('allows deleting ABIs', async () => {
          await resolverInstance.setABI(subdomainNamehash, jsonCode, "0x666f6f", {from: bob})
          let result = await resolverInstance.ABI(subdomainNamehash, 0xFFFFFFFF);
          assert.deepEqual([result[0].toNumber(), result[1]], [1, "0x666f6f"]);

          await resolverInstance.setABI(subdomainNamehash, jsonCode, "0x", {from: bob})
          await resolverInstance.setABI(subdomainNamehash, 0x4, "0x", {from: bob})
          let result2 = await resolverInstance.ABI(subdomainNamehash, 0xFFFFFFFF);
          assert.deepEqual([result2[0].toNumber(), result2[1]], [0, null]);
      });

      it('rejects invalid content types', async () => {
        await exceptions.catchRevert(resolverInstance.setABI(subdomainNamehash, 0x3, "0x12", {from: bob}));
      });

      it('forbids setting value by non-owners', async () => {
        await exceptions.catchRevert(resolverInstance.setABI(subdomainNamehash, 0x1, "0x666f6f", {from: deployer}));
      });
  });
})
