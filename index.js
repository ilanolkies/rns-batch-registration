const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
var fs = require('fs');
var Web3 = require('web3');

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
]

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

const error = message => {
  console.log(
    chalk.red.bold(message)
  );
};

const run = async () => {
  // show script introduction
  init();

  // ask questions
  const answers = await askInput();
  const { FILENAME } = answers;

  // read file
  const content = fs.readFileSync(FILENAME);
  const labels = JSON.parse(content);

  // cancel if no names
  if (labels.length < 1)
    return error('No names to register in the file');

  const web3 = new Web3('https://public-node.rsk.co');
  const registrar = new web3.eth.Contract(registrarAbi ,'0x5269f5bc51cdd8aa62755c97229b7eeddd8e69a6');

  // check domains status
  let states = [];

  for (label of labels) {
    const hash = web3.utils.sha3(label);
    const state = await registrar.methods.state(hash).call();
    states.push(state);
  }

  // cancel if they are not in the same status
  if (!states.every((value, _, array) => value == array[0]))
    return error('Names are not in the same state');

  // import credentials

  // ask to run next step

  // save tx hashes

  // show success message
  success('Done!');
};

run();
