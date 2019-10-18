const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
var fs = require('fs');
var Web3 = require('web3');
var HDWalletProvider = require('truffle-hdwallet-provider');

const registrarAbi = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "_hash",
        "type": "bytes32"
      }
    ],
    "name": "state",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

const init = () => {
  console.log(
    chalk.green(
      figlet.textSync('RNS registration tool', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })
    )
  );
};

const askInput = () => {
  const questions = [
    {
      name: 'FILENAME',
      type: 'input',
      default: 'input.json',
      message: 'Where are the names to register?'
    }
  ];
  return inquirer.prompt(questions);
};

const success = message => {
  console.log(
    chalk.green.bold(message)
  );
};

const alert = message => {
  console.log(
    chalk.yellow.bold(message)
  );
};

const error = message => {
  console.log(
    chalk.red.bold(message)
  );
};

const run = async () => {
  // show script introduction
  init();


  // read config
  const contentFile = fs.readFileSync('config.json');
  const config = JSON.parse(contentFile);

  // ask questions
  const answers = await askInput();
  const { FILENAME } = answers;

  // read file
  const content = fs.readFileSync(FILENAME);
  const labels = JSON.parse(content);

  // cancel if no names
  if (labels.length < 1)
    return error('No names to register in the file');

  alert(`About to check ${labels} states`);

  const web3 = new Web3(config.node);
  const registrar = new web3.eth.Contract(registrarAbi ,'0x8cd41103edcf309714e771cd0c01f1e2b09f4842');

  // check domains status
  let states = [];

  for (label of labels) {
    const hash = web3.utils.sha3(label);
    const state = await registrar.methods.state(hash).call();
    states.push(state);
  }

  const parseStatus = n => {
    if (n == 0) return 'Open';
    if (n == 1) return 'Auction';
    if (n == 2) return 'Owned';
    if (n == 3) return 'Reveal';
  }

  success(`Names are in ${parseStatus(states[0])} state`);

  // cancel if they are not in the same status
  if (!states.every((value, _, array) => value == array[0]))
    return error('Names are not in the same state');

  // import credentials
  const mnemonic = fs.readFileSync('.secret', 'utf-8');

  if (!mnemonic)
    return error('No mnemonic found');

  var provider = new HDWalletProvider(mnemonic, config.node);
  web3.setProvider(provider);

  const from = await web3.eth.getAccounts().then(accounts => accounts[0]);
  alert(`Using ${from} address`);

  // ask to run next step

  // save tx hashes

  // show success message
  provider.engine.stop();
  success('Done!');
};

run();
