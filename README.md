# alexia-skills-sdk_StockQuoter

Alexa Skill to look up real-time stockquotes through Google Finance.

You can redeploy this skill by:

* Creating the skill in [Alexa skill Kit Dev dashboard](https://developer.amazon.com/edw/home.html#/).
* Create the intent schema, custom slot type and sample utterances from speechAssets.
* Host your own Stock Symbol API endpoint using [StockSymbolSearch](https://github.com/tuggyboat/StockSymbolSearch) python [bottle](http://bottlepy.org/docs/dev/) script.
* Replace the endpoint URL in index.js
* Zip up index.js along with node_modules and upload to a [AWS Lambda](https://aws.amazon.com/lambda/details/) function.
* Copy the AWS Lambda ARN back to the Alexa Skills Page.
* Test your Skill out
