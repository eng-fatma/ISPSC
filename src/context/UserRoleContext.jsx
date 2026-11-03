import { createContext, useState, useContext } from 'react'

const UserRoleContext = createContext()

export function UserRoleProvider({ children }) {
  const [userRole, setUserRole] = useState('farmer')
  const [companyField, setCompanyField] = useState('')

  return (
    <UserRoleContext.Provider value={{ userRole, setUserRole, companyField, setCompanyField }}>
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  return useContext(UserRoleContext)
}