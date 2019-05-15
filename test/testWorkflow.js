const ENSRegistry = artifacts.require('ENSRegistry');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');
const PublicResolver = artifacts.require('PublicResolver');

const exceptions = require("./exceptions.js");
const namehash = require('eth-ens-namehash');

contract('Workflow', function (accounts) {

  const deployer = accounts[0];
  const bob = accounts[1];
  const coolContractAddress = accounts[2];

  let registryInstance;
  let registrarInstance;
  let resolverInstance;
  const initialNode = '0x00';

  const tld = 'eth';
  const tldLabel = web3.utils.keccak256(tld);
  const tldNamehash = namehash.hash(tld);

  const subdomain = 'test'
  const subdomainLabel = web3.utils.keccak256(subdomain);
  const subdomainNamehash = namehash.hash(`${subdomain}.${tld}`);

  // Deep copy of the abi as it is modified during deployment
  const coolContractAbi = JSON.parse(JSON.stringify(ENSRegistry.abi));
  const jsonAbiCode = 0x1;

  before(async function() {
    // Deploy contracts
    registryInstance = await ENSRegistry.new();
    registrarInstance = await FIFSRegistrar.new(registryInstance.address, tldNamehash);
    await registryInstance.setSubnodeOwner(initialNode, tldLabel, registrarInstance.address);
    resolverInstance = await PublicResolver.new(registryInstance.address);
  });

  describe('Initial Setup', function() {
    it('Step 1. Register a subdomain with the registrar', async function () {
      await registrarInstance.register(subdomainLabel, bob, {from: bob});
      assert.equal(await registryInstance.owner(subdomainNamehash), bob);
    });

    it('Step 2. Set the resolver for that domain in the registry', async function () {
      await registryInstance.setResolver(subdomainNamehash, resolverInstance.address, {from: bob});
      assert.equal(resolverInstance.address, await registryInstance.resolver(subdomainNamehash));
    });

    it('Step 3. Set the address and abi for that domain in the resolver', async function () {
        await resolverInstance.setAddr(subdomainNamehash, coolContractAddress, {from: bob});
        assert.equal(await resolverInstance.addr(subdomainNamehash), coolContractAddress);

        const hexAbi = web3.utils.utf8ToHex(JSON.stringify(coolContractAbi));
        await resolverInstance.setABI(subdomainNamehash, jsonAbiCode, hexAbi, {from: bob})

        let result = await resolverInstance.ABI(subdomainNamehash, jsonAbiCode);
        assert.equal(result[1], hexAbi);
        const storedAbi = JSON.parse(web3.utils.hexToUtf8(result[1]));
        assert.deepEqual(storedAbi, coolContractAbi);
    });
  })

  describe('Usage', function() {

    it('allows to lookup address and abi based on only the domain and registry address', async function () {
        // These two pieces of information need to be known:
        const domain = 'test.eth';
        const registryAddress = registryInstance.address

        // The rest can be fetched:
        // ------------------------
        const node = namehash.hash(domain);
        // Instantiate Registry
        const newRegistry = await ENSRegistry.at(registryAddress);
        // Fetch resolver for this node
        const resolverAddress = await newRegistry.resolver(node);
        // Instantiate resolver
        const newResolver = await PublicResolver.at(resolverAddress);
        // Fetch address and ABI for that domain
        const storedContractAddress = await newResolver.addr(node);
        const storedContractAbiHex = await newResolver.ABI(node, jsonAbiCode);
        const storedContractAbi = JSON.parse(web3.utils.hexToUtf8(storedContractAbiHex[1]));

        assert.equal(storedContractAddress, coolContractAddress);
        assert.deepEqual(storedContractAbi, coolContractAbi);
    });
  })


})
