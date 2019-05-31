module.exports = async function registerLabelAndStoreAddressAndAbi(
  ENSArtifacts, ContractArtifact, web3, label, tld
) {

  const ENSArtifact = ENSArtifacts.registry;
  const RegistrarArtifact = ENSArtifacts.registrar;
  const ResolverArtifact = ENSArtifacts.resolver;

  const netId = web3.version.network;

  // We want to end up with the ownership of this domain
  const name = `${label}.${tld}`;
  const node = require('eth-ens-namehash').hash(name);

  // This is the contract that we want our domain to point to
  const contractAddress = ContractArtifact.networks[netId].address.toLowerCase();
  // The domain will be owned by the deploying account, all transactions modifying node records
  // will have to be performed from this account
  const owner = web3.eth.accounts[0].toLowerCase();

  // Get ENS contract instances
  const registry = await ENSArtifact.at(ENSArtifact.networks[netId].address);
  const registrar = await RegistrarArtifact.at(RegistrarArtifact.networks[netId].address);
  const resolver = await ResolverArtifact.at(ResolverArtifact.networks[netId].address);

  // Register mycontract.<tld>
  await registrar.register(web3.sha3(label), owner, {from: owner});
  if ((await registry.owner(node)).toLowerCase() !== owner) {
    throw `Failed to register '${name}'`;
  } else {
    console.log(`Successfully registered '${name}' (node '${node}')`);
  }

  // Set the resolver
  await registry.setResolver(node, resolver.address);
  if ((await registry.resolver(node)).toLowerCase() !== resolver.address.toLowerCase()) {
    throw `Failed to set resolver for '${name}'`;
  } else {
    console.log(`Successfully set resolver for '${name}'`);
  }

  // Store the address of the deployed contract with the resolver
  await resolver.setAddr(node, contractAddress);
  if ((await resolver.addr(node)).toLowerCase() !== contractAddress) {
    throw `Failed to set address in resolver for '${name}'`;
  } else {
    console.log(`Successfully set address ${contractAddress} for '${name}' in resolver`);
  }

  const hexAbi = web3.toHex(ContractArtifact.abi); // Objects are JSON.stringified first
  await resolver.setABI(node, 0x1, hexAbi, {from: owner})
  const storedAbiString = web3.toAscii((await resolver.ABI(node, 0x1))[1]);
  if (JSON.stringify(ContractArtifact.abi) !== storedAbiString) {
    throw `Failed to store ABI in resolver for '${name}'`;
  } else {
    console.log(`Successfully set ABI for '${name}' in resovler`);
  }
}
