const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
var fs = require('fs');

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

const run = async () => {
  // show script introduction
  init();

  // ask questions
  const answers = await askInput();
  const { FILENAME } = answers;

  // read file
  const content = fs.readFileSync(FILENAME);
  const labels = JSON.parse(content);

  console.log(labels)

  // check domains status


  // if they are in the same status,
  // ask to run next step

  // save tx hashes

  // show success message
  success('Done!');
};

run();
