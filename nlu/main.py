# from deeppavlov import build_model, configs

# bot1 = build_model(configs.go_bot.gobot_dstc2, download=True)

# bot1(['hi, i want restaurant in the cheap pricerange'])
# bot1(['bye'])

# bot2 = build_model(configs.go_bot.gobot_dstc2_best, download=True)

# bot2(['hi, i want chinese restaurant'])
# bot2(['bye'])

from deeppavlov import build_model, configs
from pprint import pprint
import logging
import json

import custom_network

logging.getLogger().setLevel(logging.DEBUG)

model = build_model('model_config.json')

utterance = ""
while utterance != 'exit':
  res = model([utterance])
  print(json.dumps(res[0], indent=2, sort_keys=True))
  if 'queryResult' in res[0] and 'fulfillmentText' in res[0]['queryResult']:
    print(">> " + res[0]['queryResult']['fulfillmentText'])
  utterance = input(':: ')