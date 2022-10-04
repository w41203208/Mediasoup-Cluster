const names = [
  'Abbey Kern',
  'Addyson Govan',
  'Ainsley Weise',
  'Alayah Dunston',
  'Alyson Lamb',
  'Alyvia Linder',
  'Anais Lalonde',
  'Andreas Belden',
  'Anika Mcadams',
  'Anson Crosby',
  'Anya Thayer',
  'Bailey Kang',
  'Barrett Higgs',
  'Braden Parrish',
  'Bradley Jarvis',
  'Brooke Mccoy',
  'Bruno Durrett',
  'Cason Duda',
  'Cassie Long',
  'Colette Wiles',
  'Dakota Carley',
  'Danielle Chou',
  'Daphne South',
  'Dustin Baer',
  'Eliza Bey',
  'Elly Allan',
  'Emmy Springs',
  'Eric Horning',
  'Evalyn Ludwick',
  'Ford Carrol',
  'Franco Alton',
  'Graeme Pepe',
  'Greyson Van',
  'Iker Eberhardt',
  'Ivan Belle',
  'Ivanna Branum',
  'Jaelynn Bemis',
  'Jakob Suh',
  'Jasmine Snapp',
  'Jaydon Mccants',
  'Jeremiah Ling',
  'Jet Brashear',
  'Josue Marler',
  'Kaiden Leonard',
  'Karina Spina',
  'Kayla Osborn',
  'Kennedy Latham',
  'Kenny Donley',
  'Kiana Furman',
  'Lailah Parson',
  'Landon Venable',
  'Lara Blair',
  'Leela Rahman',
  'Leon Benge',
  'Levi Mayo',
  'Lila Wilson',
  'Lucca Maus',
  'Macey Keeney',
  'Maleah Lambert',
  'Marco Binkley',
  'Maryam Jenks',
  'Mikael Baier',
  'Mikaela Nalley',
  'Mira Rooker',
  'Molly Brandon',
  'Nina Whaley',
  'Not Dendy',
  'Ollie Maxson',
  'Otto Jessie',
  'Penny Bechtel',
  'Philip Duckett',
  'Rayan Kiefer',
  'Reece Cooney',
  'Royce Battle',
  'Sarai Pulliam',
  'Skyler Leech',
  'Sterling Soliz',
  'Tia Darr',
  'Tommy Esposito',
  'Tony Thatcher',
  'Violet Neely',
  'Willow Joseph',
  'Xander Musick',
  'Zara Vereen',
  'Zion Steele'
]

export const getUserName = () => {
  const _idx = Math.floor(Math.random() * names.length)
  return names[_idx]
}