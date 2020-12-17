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
    let output = [header].concat(eggs); //build an array of strings to print out line-by-line

    //remove eggs that do not have matching users
    if (hideNonMatch) {
        eggs = eggs.filter(e => e.users);
    }

    //determine the separator in the egg data or default to "|"
    //a KeySAVe output should have a sep = " - " or " | " or ","
    let sep = /\W([|-])\W/.exec(eggs[0].egg.info) || /\D(,)\D/.exec(eggs[0].egg.info);
    sep = (sep === null || sep === "|") ? "\|" : sep[1];
    let colCount;
    try {
        let rawSep = String.raw`${sep}`;
        console.log(rawSep);
        colCount = eggs[0].egg.info.match(RegExp(`(?:${rawSep}|^)([\\w .♂♀()[\\]]{2,}?|(?: ?\\d,\\d ?))(?=${rawSep}|$)`, "gm")).length;
    }
    catch(err) {
        colCount = 1;
        console.log(err);
    }
    console.log(`sep: ${sep}, colCount: ${colCount}`);

    //check whether header row exists. if false, unshift a header with blank labels
    //then append a "Matches" column to the row
    if (header === "") {
        output = [(Array(colCount).fill("label").join(sep))];
    } else {
        output = [header];
    }
    output[0] += sep + "Matches";
    colCount += 1;

    //modify output to fit outputFormat (csv or Reddit table)
    if (outputFormat === "csv") {
        output = output.concat(eggs.map((x) => {
            let line = `${x.egg.info}${sep}`
                .replace(/(\W)(\d,\d)/,"$1\"$2\"") //wrap row,col values in quotation marks
                .replaceAll(sep, ",");
            if (x.users) {
                line += `"${x.users.filter(y => y.archived === false).map(y => y.user).join(", ")}"`;
            }
            return line;
        }));
        output[0] = output[0].replaceAll(sep, ",");
    } else if (outputFormat === "redditTable") {
        output = output.concat(eggs.map((x) => {
            let line = `| ${x.egg.info}${sep}`
                .replaceAll(sep, " | ")
                .trim();
            if (x.users) {
                line += x.users
                    .filter(y => y.archived === false)
                    .map(y => ` [${y.user}](/r/SVExchange/comments/${y.link}/${x.egg.esv.padStart(4, "0")})`)
                    .join(", ");
            }
            line += " |";
            return line;
        }));
        output[0] = `| ${output[0].replaceAll(sep, " | ")} |`;
        console.log(output);
        //add marker row required by Reddit markdown for tables
        output.splice(1,0,`|${Array(colCount).fill("----").join("|")}|`);
    }

    //console.log(output.join('\n'));
    document.getElementById("output").innerHTML = output.join("\n");
}