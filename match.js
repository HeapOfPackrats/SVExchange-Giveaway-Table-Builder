window.onload = async () => {
    let SVExDBJson = await getTsvs();
    let timeout;
    let state = {
        matchedEggs: undefined,
        gen: 7,
        outputFormat: "redditTable",
        hideNonMatch: false
    };

    async function matchEggsAndPrint() {
        let KeySAVeDump = document.getElementById("KeySAVeDump").value; //KeySAVe data or URL
        matchedEggs = await getEsvs(KeySAVeDump).then(eggs => matchUsersToEggs(eggs, SVExDBJson, state.gen));
        printGiveawayOutput(matchedEggs, state.outputFormat, state.hideNonMatch);
        if (document.getElementById("output").innerHTML !== "") {
            document.getElementById("copyOutput").hidden = false;
            document.getElementById("output").hidden = false;
        } else {
            document.getElementById("copyOutput").hidden = true;
            document.getElementById("output").hidden = true;
        }
    }

    document.getElementById("KeySAVeDump").addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(matchEggsAndPrint, 500);
    });

    document.getElementById("gen6").addEventListener("click", () => {
        state.gen = 6;
        matchEggsAndPrint();
    });

    document.getElementById("gen7").addEventListener("click", () => {
        state.gen = 7;
        matchEggsAndPrint();
    });

    document.getElementById("csv").addEventListener("click", () => {
        state.outputFormat = "csv";
        if (matchedEggs) {
            printGiveawayOutput(matchedEggs, state.outputFormat, state.hideNonMatch);
        }
    });

    document.getElementById("redditTable").addEventListener("click", () => {
        state.outputFormat = "redditTable";
        if (matchedEggs) {
            printGiveawayOutput(matchedEggs, state.outputFormat, state.hideNonMatch);
        }
    });

    document.getElementById("hideNonMatch").addEventListener("click", () => {
        state.hideNonMatch = document.getElementById("hideNonMatch").checked;
        if (matchedEggs) {
            printGiveawayOutput(matchedEggs, state.outputFormat, state.hideNonMatch);
        }
    });

    document.getElementById("copyOutput").addEventListener("click", () => {
        let output = document.getElementById("output");
        console.log(output);
        output.select();
        document.execCommand("copy");
    })
};

//return String of Pokemon (egg) data
async function getEsvs(KeySAVeDump) {
    //KeySAVe information will be obtained via user input or pastebin.com
    let KeySAVeOutput;
    /*
    let pastebinRe = /pastebin.com\/(?:raw\/)?([A-Za-z0-9]{8})/;
    if(pastebinRe.test(KeySAVeDump)) {
        KeySAVeOutput = await fetch("https://pastebin.com/raw/" + pastebinRe.exec(KeySAVeDump)[1])
            .then(response => response.text())
            .catch(err => console.log(`Failed to get a response from pastebin. Error: ${err}`))
            .then(text => text); 
    }*/
    //else {
    KeySAVeOutput = KeySAVeDump;
    //}

    return KeySAVeOutput;
}

//grab SVEx-Crawler data as JSON (courtesy of Cu3PO42)
async function getTsvs(dbUrl="https://raw.githubusercontent.com/Cu3PO42/SVEx-Crawler/gh-pages/tsvs.json") {
    let TSVs = await fetch(dbUrl)
        .catch(err => Console.log(`Failed to get TSV JSON from ${dbUrl}. Error: " + ${err}`))
        .then(response => response.json());
    return TSVs;
}

//outputs { header: "", eggs: [{egg: {info: "", esv: ####}, users: [{user: "", link: ""}]}] }
function matchUsersToEggs(eggs, TSVs, gen) {
    TSVs = TSVs["tsvs" + gen]; //retrieve appropriate value from key "tsvs6" or "tsvs7"
    let re = /\b\d{4}\b/; //TSVs and ESVs range from 0000 to 4095
    let esv;

    eggs = eggs.split(/\r\n|\n|\r/); //https://stackoverflow.com/a/1761086

    //determine whether header row exists and grab if true
    let start;
    let header = "";
    for (let i=0; i<eggs.length; i++) {
        if (re.test(eggs[i])) { //we reach egg data before a header; header likely doesn't exist
            start = i;
            break;
        } else if (/\bBox\b|\bSlot\b|\bSpecies\b|\bNature\b|\bAbility\b|\bHP.ATK.DEF.SPATK.SPDEF.SPE\b|\bHP\b|\bESV\b/.test(eggs[i])) {
            header = eggs[i];
            start = i+1;
            break;
        }
    }
    for (let i=start; i<eggs.length; i++) {
        esv = re.exec(eggs[i]);
        if (esv === null) {
            continue;
        } else {
            esv = Number(esv[0]);
        }
        if (TSVs[esv].length === 0) { //No corresponding TSV value exists on SVEx
            eggs[i] = {egg: {info: eggs[i], esv: String(esv)}, users: null};
        } else {
            eggs[i] = {egg: {info: eggs[i], esv: String(esv)}, users: TSVs[esv].map(thread => thread)};
        }
    }
    eggs = eggs.filter(e => typeof e === "object"); //remove whitespace and junk lines
    console.log("Matched Eggs:", eggs);
    console.log("Header:\n", header);
    //{ header: "", eggs: [{egg: {info: "", esv: ####}, users: [{user: "", link: ""}]}] }
    return {header: header, eggs: eggs};
}

//takes a { header: "", eggs: [{egg: {info: "", esv: ####}, users: [{user: "", link: ""}]}] } object
//transforms and outputs the info as HTML
function printGiveawayOutput(parsedEggs, outputFormat, hideNonMatch=false) {
    let {header, eggs} = parsedEggs;
    //remove eggs that do not have matching users
    if (hideNonMatch) {
        eggs = eggs.filter(e => e.users);
        if (eggs.length === 0) {
            document.getElementById("output").innerHTML = "No matches";
        }
    }
    let output; //build an array of strings to print out line-by-line

    //determine the separator in the egg data or default to "|"
    //a KeySAVe output should have a sep = " - " or " | " or ","
    let sep = /\W([|-])\W/.exec(eggs[0].egg.info) || /\D ?(,) ?\w/.exec(eggs[0].egg.info);
    sep = (sep === null) ? "|" : sep[1]; 
    let sepRe = (sep === "|") ? String.raw`\|(\W|$)` : String.raw`${sep}` //"|" is a regex special char
    let colCount;
    try {
        colCount = eggs[0].egg.info.match(RegExp(`(?:${sepRe}|^)([\\w .♂♀()[\\]]{2,}?|(?: ?\\d,\\d ?))(?=${sepRe}|$)`, "gm")).length;
    }
    catch(err) {
        colCount = 1;
        console.log(err);
    }
    console.log(`sep: ${sep}, sepRe: ${sepRe} colCount: ${colCount}`);

    //check whether header is a blank string. if true, add a new header with blank labels
    //in either case, append a "Matches" column to the header row
    if (header === "") {
        output = [(Array(colCount).fill("label").join(sep))];
        if (sep === "|") {
            output[0] = `| ${output[0]} |`.replaceAll(/\|(?!$)/g, " | ");
        }
    } else {
        output = [header];
    }
    output[0] += (sep === "|") ? " Matches" : (sep + " Matches"); //account for trailing sep if Reddit table style header is included
    colCount += 1;

    //modify output to fit outputFormat (csv or Reddit table)
    if (outputFormat === "csv") {
        output = output.concat(eggs.map((x) => {
            let line = (sep === "|") ? `${x.egg.info}` : `${x.egg.info}${sep}`;
            line = line.replace(/(\W)(\d,\d)/,"$1\"$2\"") //wrap row,col values in quotation marks for csv
                       .replaceAll(RegExp(` ?${sepRe} ?`, "g"), ",")
                       .replace(/^,/, ""); //trim off any leading commas
            if (x.users) {
                line += `"${x.users.filter(y => y.archived === false).map(y => y.user).join(", ")}"`;
            }
            return line;
        }));
        output[0] = output[0].replaceAll(RegExp(` ?${sepRe} ?`, "g"), ",").replace(/^,/, "");
    } else if (outputFormat === "redditTable") {
        output = output.concat(eggs.map((x) => {
            let line = (sep === "|") ? `${x.egg.info}` : `| ${x.egg.info}${sep}`
                .replace(/(\W)(\d,\d)/,"$1\"$2\"")
                .replaceAll(RegExp(` ?${sepRe}(?!\\d") ?`, "g"), " | ")
                .replace(/"(\d,\d)"/,"$1")
                .trim();
            if (x.users) {
                line += x.users
                    .filter(y => y.archived === false)
                    .map(y => ` [${y.user}](/r/SVExchange/comments/${y.link}/${x.egg.esv.padStart(4, "0")})`)
                    .join(",");
            }
            line = `${line} |`;
            return line;
        }));
        output[0] = (sep === "|") ? 
            `${output[0].replaceAll(RegExp(` ?${sepRe} ?`, "g"), " | ")} |`.trim():
            `| ${output[0].replaceAll(RegExp(` ?${sepRe} ?`, "g"), " | ")} |`;

        //add marker row required by Reddit markdown for tables
        output.splice(1,0,`|${Array(colCount).fill("----").join("|")}|`);
    }
    console.log(eggs);

    //console.log(output.join('\n'));
    document.getElementById("output").innerHTML = output.join("\n");
}