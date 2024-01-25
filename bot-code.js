// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const WickrIOAPI = require('wickrio_addon');
const WickrIOBotAPI = require('wickrio-bot-api');
const util = require('util')
const logger = require('wickrio-bot-api').logger
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { RekognitionClient, RecognizeCelebritiesCommand} = require('@aws-sdk/client-rekognition');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime')


console.log = function () {
  logger.info(util.format.apply(null, arguments))
}
console.error = function () {
  logger.error(util.format.apply(null, arguments))
}

var fs = require('fs');

module.exports = WickrIOAPI;
process.stdin.resume(); // so the program will not close instantly
var bot;

let fileName = uuidv4();

async function exitHandler(options, err) {
  try {
    var closed = await bot.close();
    console.log(closed);
    if (err) {
      console.log("Exit Error:", err);
      process.exit();
    }
    if (options.exit) {
      process.exit();
    } else if (options.pid) {
      process.kill(process.pid);
    }
  } catch (err) {
    console.log(err);
  }
}

//catches ctrl+c and stop.sh events
process.on('SIGINT', exitHandler.bind(null, {
  exit: true
}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {
  pid: true
}));
process.on('SIGUSR2', exitHandler.bind(null, {
  pid: true
}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true
}));

/////////////////////////////////////

// Respond to user's input.
async function createResponse(request, vGroupID) {
  // setup the clients
  bot.processesJsonToProcessEnv()
  var tokens = JSON.parse(process.env.tokens)
  const REGION = tokens.AWS_REGION.value
  const BUCKET = tokens.AWS_BUCKET.value

  console.log('entered createResponse');
  console.log("file location", request)

  const s3 = new S3Client({ region: REGION });
  var uploadParams = {
    Bucket: BUCKET,
    Body: ''
  }

  var fileStream = fs.createReadStream(request);
  fileStream.on('error', function(err) {
    console.log('File Error', err);
  });
  uploadParams.Body = fileStream;
  uploadParams.Key = fileName + ".jpg";
  
  const s3Data = await s3.send(new PutObjectCommand(uploadParams, function (err, data) {
    if (err) {
      console.log("Error", err);
    } if (data) {
      console.log("Upload Success", s3Data.Location);
    }
  }));

  const rekogClient = new RekognitionClient({region: REGION});
  
  const Celebparams = {
      Image: {
        S3Object: {
          Bucket: BUCKET,
          Name: uploadParams.Key
        },
      },
    }
  console.log("input", Celebparams)
  const data = await rekogClient.send(new RecognizeCelebritiesCommand(Celebparams));
  console.log("output", data)

  const bedrockclient = new BedrockRuntimeClient({region: REGION,});

  const aiModelId = 'anthropic.claude-instant-v1';
  
  const invokeModelParams = {
    body: JSON.stringify({
        prompt: "\n\nHuman: Top 5 bio-data facts about " + data.CelebrityFaces[0].Name + "\n\nAssistant:",
        max_tokens_to_sample: 500
    }),
    modelId: aiModelId,
    accept: 'application/json',
    contentType: 'application/json'
};
  console.log('this was the request', invokeModelParams)

  const command = new InvokeModelCommand(invokeModelParams);
  const response = await bedrockclient.send(command);

  const aiResponseJson = JSON.parse(
    new TextDecoder().decode(response.body)
  );

  const output =  aiResponseJson.completion.trim();
  messageOutput = "This person's name is " + data.CelebrityFaces[0].Name + "\n\n" + output
  console.log("message output", messageOutput)
  WickrIOAPI.cmdSendRoomMessage(vGroupID, messageOutput);
}

async function main() { // entry point
  logger.info('entering main')
  try {
    var status;
    if (process.argv[2] === undefined) {
      var bot_username = fs.readFileSync('client_bot_username.txt', 'utf-8');
      bot_username = bot_username.trim();
      bot = new WickrIOBotAPI.WickrIOBot();
      status = await bot.start(bot_username)
    } else {
      bot = new WickrIOBotAPI.WickrIOBot();
      status = await bot.start(process.argv[2])
    }
    if (!status) {
      exitHandler(null, {
        exit: true,
        reason: 'Client not able to start'
      });
    }

    await bot.startListening(listen); 
  } catch (err) {
    logger.error(err);
  }
}

async function listen(rMessage) {
  logger.info('entering listen')
  rMessage = JSON.parse(rMessage);
  var sender = rMessage.sender;
  var vGroupID = rMessage.vgroupid;
  //var messageInput = rMessage.message
  var request = rMessage.file.localfilename;
  var userArr = [];
  userArr.push(sender);
  await createResponse(request, vGroupID)
}

main();