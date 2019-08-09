const _ = require('lodash');
const request = require('request-promise');

function formatVenue(venue) {
    const sourceLink = venue.sameAs ? venue.sameAs.value : (venue.publisher ? venue.publisher.value : '');
    return `
    <div style="display: flex; align-items: center;">
        <a href="${sourceLink}" target="_blank" rel="noopener noreferrer">
            <div style="${venue.img ? `background-image: url(${venue.img.value});` : ''} width: 50px; height: 50px; margin-right: 10px; background-color: lightgray; background-size: cover; background-position: center;"></div>
        </a>
        <p>
            ${venue.title ? venue.title.value : ''} (${venue.streetAddress ? venue.streetAddress.value : ''} ${venue.city ? `, ${venue.city.value}` : ''})
            ${venue.telephone ? `<br>Phone: <a href="tel:${venue.telephone.value}">${venue.telephone.value}</a>` : ''}
            ${venue.email ? `<br>Email: <a href="mailto:${venue.email.value}">${venue.email.value}</a>` : ''}
            <br>Source: <a href="${sourceLink}" target="_blank" rel="noopener noreferrer">${sourceLink}</a>
        </p>
    </div>
    `;
}

async function getVenues(state) {
    const category = state.food;
    const city = state.area;
    // const price = state.price;

    const query = `
    SELECT DISTINCT *
    WHERE {
        # Get a list of URIs
        {
            SELECT DISTINCT ?uri WHERE {
                GRAPH <http://3cixty.com/cotedazur/places> { ?uri a dul:Place . }
                # Mandatory fields
                OPTIONAL { ?uri locationOnt:businessType ?cat . }
                OPTIONAL { ?uri locationOnt:businessTypeTop ?topCat . }
                OPTIONAL { ?uri schema:location/schema:addressLocality ?locality . }
                ?uri geo:location ?location .
                ?location locn:geometry ?geo .
                ?location geo:lat ?lat .
                ?location geo:long ?long .
                ${category ? `FILTER(?topCat IN(<${category}>) || ?cat IN(<${category}>))` : ''}
                ${city ? `FILTER((LCASE(?locality) IN(${JSON.stringify(city)})))` : ''}

            }
            GROUP BY ?uri
            ORDER BY RAND()
            OFFSET 0
            LIMIT 3
        }
        # Get details
        OPTIONAL { ?uri rdfs:label ?title . }
        OPTIONAL { ?uri schema:telephone ?telephone . }
        OPTIONAL { ?uri schema:email ?email . }
        OPTIONAL {
            ?uri schema:description ?description .
            BIND (LANG(?description) AS ?lang) .
        }
        OPTIONAL { ?uri schema:url ?url . }
        OPTIONAL {
            ?uri schema:aggregateRating ?aggregateRating .
            ?aggregateRating schema:ratingValue ?rating .
        }
        OPTIONAL {
            ?uri locationOnt:businessType ?businessType .
            OPTIONAL { ?businessType skos:prefLabel ?categoryName . }
        }
        OPTIONAL {
            ?uri locationOnt:businessTypeTop ?businessTypeTop .
            OPTIONAL { ?businessTypeTop skos:prefLabel ?topCategoryName . }
        }
        OPTIONAL {
            ?uri geo:location ?loc .
            ?loc geo:lat ?latitude .
            ?loc geo:long ?longitude .
        }
        OPTIONAL {
            ?uri schema:location ?addr .
            OPTIONAL { ?addr schema:postalCode ?postalCode . }
            OPTIONAL { ?addr schema:streetAddress ?streetAddress . }
            OPTIONAL { ?addr schema:addressLocality ?city . }
        }
        OPTIONAL {
            GRAPH ?gImg {
                FILTER (STRSTARTS(STR(?gImg), "http://3cixty.com/cotedazur/"))
                ?uri lode:poster ?imgObj .
                ?imgObj ma-ont:locator ?img .
            }
        }
        OPTIONAL { ?uri rdfs:seeAlso ?seeAlso . }
        OPTIONAL { ?uri dc:publisher ?publisher . }
        OPTIONAL { ?uri owl:sameAs ?sameAs . }
        OPTIONAL { ?uri topo:importance ?topoImportance . }
    }
    `;

    console.log(query);

    const body = JSON.parse(await request({
        url: 'https://kb.city-moove.fr/sparql',
        method: 'POST',
        form: {
            query,
            format: 'application/sparql-results+json'
        }
    }));

    const grouped = [];
    body.results.bindings.forEach(result => {
      const uniqueResult = grouped.filter(e => e['uri']['value'] === result['uri']['value']).pop();
      if (uniqueResult) {
        // combine
        Object.keys(result).forEach(key => {
          if (uniqueResult[key]) {
            if (Array.isArray(uniqueResult[key])) {
              if (!uniqueResult[key].some(e => _.isEqual(e, result[key]))) {
                // not yet in the array, add it
                uniqueResult[key].push(result[key]);
              }
            } else if (!_.isEqual(uniqueResult[key], result[key])) {
              // results are differerent, create an array
              uniqueResult[key] = [uniqueResult[key], result[key]];
            }
          } else {
            // property is missing, add it
            uniqueResult[key] = result[key];
          }
        });
      } else {
        // add
        grouped.push(result);
      }
    });

    return grouped;
}

module.exports = function(controller) {

    controller.on('message,direct_message', async (bot, message) => {
        if (message.text.match(/^hi|hey|hello|hola$/i)) {
            await bot.reply(message, 'Hello! What kind of restaurant are you looking for?');
            return;
        }

        try {
            const body = await request({
                url: 'http://localhost:4949/go-bot',
                method: 'POST',
                json: {
                    context: [
                        message.text
                    ]
                }
            });

            console.log(body);

            await bot.reply(message, 'Ok! Let me see if I can find something...');

            const { queryResult } = body[0][0];
            if (queryResult.allRequiredParamsPresent === true) {
                const { state } = queryResult;
                // await bot.reply(message, JSON.stringify(state));

                const venues = await getVenues(state);
                console.log(venues);

                await bot.reply(message, `Here is what I found for you:<br><br>${Object.values(venues).map(formatVenue).join('')}`);
            } else if (queryResult.fulfillmentText) {
                await bot.reply(message, queryResult.fulfillmentText);
            }
        } catch (err) {
            await bot.reply(message, 'Oops, I crashed! The issue has been logged and it will be fixed soon!');
            throw err;
        }
    });
}
