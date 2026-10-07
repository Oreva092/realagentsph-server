export function normalizeWhatsapp(value){
    if(typeof value !== "string" || !value) return value;

    let digits = value.replace(/\D/g, "");

    if(digits.startsWith("2340")){
        digits = "234" + digits.slice(4);
    } else if(digits.startsWith("0")){
        digits = "234" + digits.slice(1);
    } else if(!digits.startsWith("234") && digits.length === 10){
        digits = "234" + digits;
    }

    return digits;
}