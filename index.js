const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs');
const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
const crypto = require('crypto');

const registrarAbi = require('./RegistrarABI.json');

const rifAbi = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant":false,
    "inputs":[
       {
          "name":"_to",
          "type":"address"
       },
       {
          "name":"_value",
          "type":"uint256"
       },
       {
          "name":"data",
          "type":"bytes"
       }
    ],
    "name":"transferAndCall",
    "outputs":[
       {
          "name":"",
          "type":"bool"
       }
    ],
    "payable":false,
    "stateMutability":"nonpayable",
    "type":"function"
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

const alert = message => {
  console.log(
    chalk.yellow.bold(message)
  );
};

const error = (message, provider = null) => {
  console.log(
    chalk.red.bold(message)
  );

  if (provider)
    provider.engine.stop();
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
    return error('No names to register in the file', provider);

  alert(`About to check ${labels} states (#: ${labels.length})`);

  const web3 = new Web3(config.node);
  const registrar = new web3.eth.Contract(registrarAbi, config.registrarAddress);
  const rif = new web3.eth.Contract(rifAbi, config.rifAddress)

  // check domains status
  const states = [];
  const hashes = []

  for (label of labels) {
    const hash = web3.utils.sha3(label);
    hashes.push(hash)
    const state = await registrar.methods.state(hash).call();
    states.push(state);
  }

  const parseStatus = n => {
    if (n == 0) return 'Open';
    if (n == 1) return 'Auction';
    if (n == 2) return 'Owned';
    if (n == 4) return 'Reveal';
  }

  const state = states[0];

  success(`Names are in ${parseStatus(state)} state`);

  // cancel if they are not in the same status
  if (!states.every((value, _, array) => value == array[0]))
    return error('Names are not in the same state', provider);

  // import credentials
  const mnemonic = fs.readFileSync('.secret', 'utf-8');

  if (!mnemonic)
    return error('No mnemonic found', provider);

  var provider = new HDWalletProvider(mnemonic, config.node);
  web3.setProvider(provider);

  const from = await web3.eth.getAccounts().then(accounts => accounts[0]);
  alert(`Using ${from} address`);

  const options = {
    from,
    gasPrice: '60000000'
  };

  // ask to run next step
  if (state == '0') {
    // open state
    const { START_AUCTION } = await inquirer.prompt([{
      name: 'START_AUCTION',
      type: 'confirm',
      message: 'Start auctions?',
    }]);

    if (START_AUCTION) {
      // start auctions
      const startAuctions = await registrar.methods.startAuctions(hashes).send(options);

      //save tx hash
      fs.writeFileSync('start-auction.txt', JSON.stringify(startAuctions));
    }
  } else if (state == '1') {
    let amount = config.amount || 1;
    // auction state
    const { BID } = await inquirer.prompt([{
      name: 'BID',
      type: 'confirm',
      message: `Bid in the auctions for ${amount} RIF?`
    }]);

    if (BID) {
      alert('Randomly generated salts will be saved in a bid-data folder.');

      const rifBalance = await rif.methods.balanceOf(from).call();

      const cost = hashes.length * amount;
      if (rifBalance < cost * 1e18)
        return error(`Not enough RIF tokens to bid - cost: ${cost} RIF, balance: ${rifBalance}`, provider);

      let bids = []

      for (hash of hashes) {
        const salt = `0x${crypto.randomBytes(32).toString('hex')}`;

        // sha bid
        const value = '0xde0b6b3a7640000';
        const shaBid = await registrar.methods.shaBid(
          hash,
          from,
          value,
          salt
        ).call();

        // bid with transferAndCall
        const bid_data = {
          hash, from, value, salt, shaBid,
        };

        bids.push(bid_data);

        fs.writeFileSync(`bids/${hash}.json`, JSON.stringify(bid_data));

        const tx = await rif.methods.transferAndCall(config.registrarAddress, value, `0x1413151f${shaBid.slice(2)}`).send(options);
        fs.writeFileSync(`bids/tx-${hash}.json`, JSON.stringify(tx));
      }

      fs.writeFileSync(`biddata.json`, JSON.stringify(bids));
    }
  } else if (state == '4') {
    const { UNSEAL } = await inquirer.prompt([{
      name: 'UNSEAL',
      type: 'confirm',
      message: `Unseal bids?`
    }]);

    if (UNSEAL) {
      for (hash of hashes) {
        const { value, salt } = JSON.parse(fs.readFileSync(`bids/${hash}.json`));

        const tx = await registrar.methods.unsealBid(hash, value, salt).send(options);

        fs.writeFileSync(`unseals/tx-${hash}.json`, JSON.stringify(tx));
      }
    }
  } else if (state == '2') {
    const { FINALIZE } = await inquirer.prompt([{
      name: 'FINALIZE',
      type: 'confirm',
      message: `Finalize bids?`
    }]);

    if (FINALIZE) {
      for (hash of hashes) {
        const tx = await registrar.methods.finalizeAuction(hash).send(options);

        fs.writeFileSync(`finalize/tx-${hash}.json`, JSON.stringify(tx));
      }
    }
  }

  // show success message
  provider.engine.stop();
  success('Done!');
};

run();
