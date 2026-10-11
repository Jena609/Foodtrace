export const DEMO_BUSINESS = {
  id: "biz_demo_foodtrace",
  name: "North Orchard Market (demo)",
  region: "Fictional demo region",
  ownerWalletAddress: "0x0000000000000000000000000000000000000de3",
};

export interface DemoInventoryItem {
  id: string;
  productName: string;
  brand: string;
  barcode: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  supplier: string;
  status: string;
  demo: true;
}

export const DEMO_ITEMS: DemoInventoryItem[] = [
  {
    id: "inv_demo_spinach",
    productName: "North Orchard Organic Baby Spinach",
    brand: "North Orchard",
    barcode: "0123456789012",
    lotNumber: "DEMO-SPIN-1001",
    expirationDate: "2026-12-01",
    quantity: 24,
    supplier: "Fictional Valley Produce",
    status: "unverified",
    demo: true,
  },
  {
    id: "inv_demo_milk",
    productName: "Harbor Mill Whole Milk",
    brand: "Harbor Mill",
    barcode: "0123456789029",
    lotNumber: "DEMO-MILK-2002",
    expirationDate: "2026-10-18",
    quantity: 40,
    supplier: "Fictional Harbor Dairy",
    status: "unverified",
    demo: true,
  },
  {
    id: "inv_demo_oysters",
    productName: "Low Country Smoked Oysters",
    brand: "Low Country",
    barcode: "",
    lotNumber: "DEMO-OYS-4004",
    expirationDate: "2024-06-01",
    quantity: 8,
    supplier: "Fictional Tide Company",
    status: "expired",
    demo: true,
  },
];
