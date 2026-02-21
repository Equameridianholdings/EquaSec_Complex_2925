export interface gatedCommunityDTO {
    _id?: string;
    name: string;
    numberOfComplexes: number;
    numberOfHouses: number;
    unitStart: number;
    unitEnd: number;
    price: number;
    complexes?: string[];
}