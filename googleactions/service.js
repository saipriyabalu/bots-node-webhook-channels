const OracleBot = require('@oracle/bots-node-sdk');
const { WebhookClient, WebhookEvent } = OracleBot.Middleware;

module.exports = (app) => {
  const logger = console;
  let expectUserResponse;

  OracleBot.init(app, {
    logger,
  });

  const webhook = new WebhookClient({
    channel: {
        url: 'https://oda-a31ecd9faf074469bdb8eae2d59314aa-da2.data.digitalassistant.oci.oraclecloud.com/connectors/v2/listeners/webhook/channels/e3df1af8-136f-48f9-a23c-60a57a9c0d0b',
        secret: 'G2vb6MBGUGQMlzhwoeOWK97cYvQjkG3e'
}
  });

  webhook
    .on(WebhookEvent.ERROR, err => console.log('Error:', err.message))
    .on(WebhookEvent.MESSAGE_SENT, message => console.log('Message to chatbot:', message))
    .on(WebhookEvent.MESSAGE_RECEIVED, message => console.log('Message from chatbot:', message))


  function assistantMessage(request) {
    return new Promise(function (resolve, reject) {
      try {	
		let input = request.inputs[0].rawInputs[0].query;
		const intent = request.inputs[0].intent;

		expectUserResponse = true;
		if (intent === 'actions.intent.CANCEL') {
			expectUserResponse = false;
		}
		
		const MessageModel = webhook.MessageModel();
		const message = {
			userId: 'anonymous',//randomIntInc(1000000, 9999999).toString(), //'anonymous', 
			messagePayload: MessageModel.textConversationMessage(input)
		};
		webhook.send(message);
		webhook.on(WebhookEvent.MESSAGE_RECEIVED, message => {
			console.log('Message Received: ' + JSON.stringify(message));
			resolve(message);
		});
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })
  }
  
  app.post('/bot/message', webhook.receiver());

  app.get('/', (req, res) => res.send('Oracle Digital Assistant for Google Assistant app is running.'));
  
  app.post('/user/message', function(args, res, next) {
    const request = args.body;
    console.log(JSON.stringify(request, null, 2));
    assistantMessage(request).then(function (result) {
	  res.setHeader('Content-Type', 'application/json');
	  res.append('Google-Assistant-API-Version', 'v2');
	  res.json(formatResponse(result.messagePayload.text));
	  next();
    })
	.catch(function(err) {
	  console.error('Error: ' + err);
	  console.dir(err);
	});
  });

  function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
  };
  
  function formatResponse(response) {
    const output = response + (' ');
    const richResponse = {
	  items: [
	    {
	 	  simpleResponse: {
		    textToSpeech: output
		  }
	    }
	  ],
	  suggestions: []
    };
    const resp = {
	  expectUserResponse: expectUserResponse
	};

    if (expectUserResponse) {
	  resp.expectedInputs = [
	    {
		  inputPrompt: {
		    richInitialPrompt: richResponse
		  },
		  possibleIntents: [
		    {
			  intent: 'actions.intent.TEXT'
		    }
		  ]
	    }
	  ];
    } else {
	  const s = output.substring(0, 59); // Has to be < 60 chars.  :(
	  resp.finalResponse = { speechResponse: { textToSpeech: s } };
    }
    return resp;
  }
  
}