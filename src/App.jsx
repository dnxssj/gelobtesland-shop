import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import { About, Beekeeping, Contact, Shipping, Impressum, Datenschutz, Widerruf } from './pages/ContentPages'
import { Success, Cancel } from './pages/CheckoutResult'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Orders from './pages/admin/Orders'
import Products from './pages/admin/Products'
import Customers from './pages/admin/Customers'
import Content from './pages/admin/Content'
import Settings from './pages/admin/Settings'

export default function App(){return <BrowserRouter><Routes><Route element={<Layout/>}><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/shop/:slug" element={<Product/>}/><Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/checkout/success" element={<Success/>}/><Route path="/checkout/cancel" element={<Cancel/>}/><Route path="/about" element={<About/>}/><Route path="/beekeeping" element={<Beekeeping/>}/><Route path="/contact" element={<Contact/>}/><Route path="/shipping" element={<Shipping/>}/><Route path="/impressum" element={<Impressum/>}/><Route path="/datenschutz" element={<Datenschutz/>}/><Route path="/widerruf" element={<Widerruf/>}/></Route><Route path="/admin/login" element={<Login/>}/><Route element={<ProtectedRoute roles={['admin','manager','staff']}/>}><Route element={<AdminLayout/>}><Route path="/admin" element={<Dashboard/>}/><Route path="/admin/orders" element={<Orders/>}/><Route path="/admin/products" element={<Products/>}/><Route path="/admin/customers" element={<Customers/>}/><Route element={<ProtectedRoute roles={['admin','manager']}/>}><Route path="/admin/content" element={<Content/>}/></Route><Route element={<ProtectedRoute roles={['admin']}/>}><Route path="/admin/settings" element={<Settings/>}/></Route></Route></Route></Routes></BrowserRouter>}

