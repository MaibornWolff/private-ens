module.exports = async function registerLabelAndStoreAddressAndAbi(
  ENSArtifacts, ContractArtifact, web3, label
) {

  const ENSArtifact = ENSArtifacts.registry;
  const RegistrarArtifact = ENSArtifacts.registrar;
  const ResolverArtifact = ENSArtifacts.resolver;

  const node = require('eth-ens-namehash').hash(`${label}.eth`);
  const netId = web3.version.network;
  const owner = web3.eth.accounts[0].toLowerCase();
  const contractAddress = ContractArtifact.networks[netId].address.toLowerCase();

  // Get ENS contract instances
  const registry = await ENSArtifact.at(ENSArtifact.networks[netId].address);
  const registrar = await RegistrarArtifact.at(RegistrarArtifact.networks[netId].address);
  const resolver = await ResolverArtifact.at(ResolverArtifact.networks[netId].address);

  // Register test.eth
  await registrar.register(web3.sha3(label), owner, {from: owner});
  if ((await registry.owner(node)).toLowerCase() !== owner) {
    throw `Failed to register '${label}'`;
  } else {
    console.log(`Successfully registered '${label}'`);
  }

  // Set the resolver
  await registry.setResolver(node, resolver.address);
  if ((await registry.resolver(node)).toLowerCase() !== resolver.address.toLowerCase()) {
    throw `Failed to set resolver for '${label}'`;
  } else {
    console.log(`Successfully set resolver for '${label}'`);
  }

  // Store the address of the deployed contract with the resolver
  await resolver.setAddr(node, contractAddress);
  if ((await resolver.addr(node)).toLowerCase() !== contractAddress) {
    throw `Failed to set address in resolver for '${label}'`;
  } else {
    console.log(`Successfully set address for '${label}' in resolver`);
  }

  const hexAbi = web3.toHex(ContractArtifact.abi); // Objects are JSON.stringified first
  await resolver.setABI(node, 0x1, hexAbi, {from: owner})
  const storedAbiString = web3.toAscii((await resolver.ABI(node, 0x1))[1]);
  if (JSON.stringify(ContractArtifact.abi) !== storedAbiString) {
    throw `Failed to store ABI in resolver for '${label}'`;
  } else {
    console.log(`Successfully set ABI for '${label}' in resovler`);
  }
}
