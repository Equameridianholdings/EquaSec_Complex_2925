export interface guardHistoryDTO {
  _id?: string;
  guardOnShift: {
    emailAddress: string;
    name: string;
    userId: string;
  };
  startShift: Date;
  station: {
    complexId?: string;
    gatedCommunityId?: string;
    name: string;
    type: "complex" | "gated";
  };
}
