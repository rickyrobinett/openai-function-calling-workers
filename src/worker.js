/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import OpenAI from 'openai';
import cheerio from "cheerio"; 

async function read_website_content(url) {
  console.log("reading website content");

  const response = await fetch(url);
  const body = await response.text();
  let cheerioBody = await cheerio.load(body);
  const resp = {
    website_body: cheerioBody("p").text(),
    url: url
  }
  return JSON.stringify(resp);
}

export default {
	async fetch(request, env, ctx) {
		const openai = new OpenAI({
			apiKey: env.OPENAI_API_KEY
		});

		try{
			const chatCompletion = await openai.chat.completions.create({
				model: "gpt-3.5-turbo-0613",
				messages: [{role: "user", content: "What's happening in New York City today?"}],
				functions: [
				{
					name: "read_website_content",
					description: "Read the content on a given website",
					parameters: {
					type: "object",
					properties: {
						url: {
							type: "string",
							description: "The URL to the website to read ",
						}
					},
					required: ["url"],
					},
				}
			]
		});
	
		const msg = chatCompletion.choices[0].message;
		console.log(msg.function_call)

		let websiteContent;

		if(msg.function_call.name === "read_website_content") {
			const url = JSON.parse(msg.function_call.arguments).url;
			websiteContent = await read_website_content(url);
			console.log(websiteContent);
		 }
	
		 const secondChatCompletion = await openai.chat.completions.create({
			model: "gpt-3.5-turbo-0613",
			messages: [
			  {role: "user", content: "What's happening in New York City today?"},
			  msg,
			  {
				role: "function",
				name: msg.function_call.name,
				content: websiteContent
			  }
			],
		  });

		  return new Response(secondChatCompletion.choices[0].message.content);
		} catch (e) {
			return new Response(e);
		}
	},
};
