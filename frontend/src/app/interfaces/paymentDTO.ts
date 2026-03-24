export interface ITNPayload {
  amount_fee: number;
  amount_gross: number;
  amount_net: number;
  custom_int1: string;
  custom_int2: string;
  custom_int3: string;
  custom_int4: string;
  custom_int5: string;
  custom_str1: string;
  custom_str2: string;
  custom_str3: string;
  custom_str4: string;
  custom_str5: string;
  email_address: string;
  item_description: string;
  item_name: string;
  m_payment_id: string;
  merchant_id: string;
  name_first: string;
  name_last: string;
  payment_status: string;
  pf_payment_id: string;
  signature: string;
}

export interface paymentDTO {
  amount: string;
  cancel_url?: string;
  email_address: string;
  item_name: string;
  m_payment_id: string;
  merchant_id: string;
  merchant_key: string;
  name_first: string;
  name_last: string;
  notify_url?: string;
  return_url?: string;
}

export interface paymentsSchemaDto {
  amount_fee: number;
  amount_gross: number;
  amount_net: number;
  date: Date;
  email_address: string;
  item_name: string;
  name_first: string;
  name_last: string;
  payment_id: string;
  payment_status: string;
  pf_payment_id: string;
  signature: string;
}
