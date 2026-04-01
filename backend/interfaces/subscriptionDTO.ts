/* eslint-disable perfectionist/sort-interfaces */
export interface cancelReturnDTO {
  code: number;
  status: string;
  data: { response: boolean }
}

export interface subscriptionDTO {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  subscription_type: string;
  recurring_amount: string;
  frequency: string;
  cycles: string;
}