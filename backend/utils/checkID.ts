const doubleDigitConverter = (digit: number) => {
    digit *= 2;
    
    if (digit < 10) return digit;

    return digit - 9;
};

const checkID = (id: string): boolean => {
    try {
        const checkSum = Number.parseInt(id[id.length - 1]);
        const newIDPayload = id.substring(0, id.length - 1);
        let sumOfEvery2ndDigit = 0;
        let sumOfEveryNon2ndDigit = 0;

        for (let right = newIDPayload.length - 1; right > 0; right -= 2) {
            sumOfEvery2ndDigit += doubleDigitConverter(Number.parseInt(newIDPayload[right]));
            sumOfEveryNon2ndDigit += Number.parseFloat(newIDPayload[right - 1]);
        }

        const totalSum = sumOfEvery2ndDigit + sumOfEveryNon2ndDigit + checkSum;

        return totalSum % 10 === 0;
    } catch {
        return false;
    }
}

export default checkID;