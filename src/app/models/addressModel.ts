export interface Address {
  AddressId?: number;
  UserId: number;
  ReceiverName: string;
  PhoneNumber: string;
  Street: string;
  City: string;
  Province: string;
  IsDefault: boolean;
  CreatedAt?: Date;
}

export interface CreateAddressDto extends Omit<Address, 'AddressId' | 'CreatedAt'> {}
export interface UpdateAddressDto extends Partial<CreateAddressDto> {
  AddressId: number;
}