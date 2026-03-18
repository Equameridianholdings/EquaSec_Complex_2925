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
