/** 토스페이먼츠 표준 은행 코드 기준 (https://docs.tosspayments.com/resources/codes#은행-코드) */
export interface Bank {
  code: string;
  name: string;
}

/** 앱 기준 SSOT: packages/core/lib/src/bank/bank.dart — 변경 시 양쪽 동기화 */
export const BANKS: Bank[] = [
  { code: '090', name: '카카오뱅크' },
  { code: '092', name: '토스뱅크' },
  { code: '004', name: 'KB국민은행' },
  { code: '088', name: '신한은행' },
  { code: '020', name: '우리은행' },
  { code: '081', name: '하나은행' },
  { code: '011', name: 'NH농협은행' },
  { code: '003', name: 'IBK기업은행' },
  { code: '089', name: '케이뱅크' },
  { code: '045', name: '새마을금고' },
  { code: '048', name: '신협' },
  { code: '071', name: '우체국' },
  { code: '023', name: 'SC제일은행' },
  { code: '027', name: '씨티은행' },
  { code: '031', name: '대구은행' },
  { code: '032', name: '부산은행' },
  { code: '039', name: '경남은행' },
  { code: '034', name: '광주은행' },
  { code: '037', name: '전북은행' },
  { code: '035', name: '제주은행' },
  { code: '007', name: '수협은행' },
  { code: '016', name: '축협' },
  { code: '050', name: '상호저축은행' },
  { code: '064', name: '산림조합' },
  { code: '002', name: '산업은행' },
  { code: '005', name: '외환은행' },
  { code: '008', name: '수출입은행' },
];

export const BANK_MAP = new Map<string, Bank>(BANKS.map((b) => [b.code, b]));

export function getBankName(code: string): string {
  return BANK_MAP.get(code)?.name ?? code;
}
