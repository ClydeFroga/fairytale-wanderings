//Подставляет плюс в начало если его нет
export const formatPhoneNumber = (phone: string) => {
  if (phone.startsWith("+")) {
    return phone;
  }

  return `+7${phone.slice(1)}`;
};
