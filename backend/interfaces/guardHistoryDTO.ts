export interface guardHistoryDTO {
  _id?: string;
  startShift: Date;
  guardOnShift: {
    userId: string;
    name: string;
    emailAddress: string;
  };
  station: {
    type: "gated" | "complex";
    gatedCommunityId?: string;
    complexId?: string;
    name: string;
  };
}
