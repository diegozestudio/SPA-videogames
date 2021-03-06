require("dotenv").config();
const { getAllGames, getApiInfo, getDbInfo } = require("./functions");
const { Router } = require("express");
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const { API_KEY } = process.env;
const axios = require("axios");
const { Videogame, Genre } = require("../db");
const router = Router();

// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);

router.get("/videogames", (req, res) => {
  try {
    const name = req.query.name;
    getAllGames().then((r) => {
      if (name) {
        let videogameName = r.filter((v) =>
          v.name.toLowerCase().includes(name.toLowerCase())
        );
        videogameName.length
          ? res.status(200).send(videogameName)
          : res.status(400).send("No existe el juego :(");
      } else {
        res.status(200).send(r);
      }
    });
  } catch (err) {
    console.log("entré al catch del get /videogames", err);
  }
});

router.get("/api_videogames", (req, res) => {
  try {
    getApiInfo().then((r) => res.status(200).send(r));
  } catch (err) {
    console.log("entré al catch del get /api_videogames", err);
  }
});

router.get("/db_videogames", (req, res) => {
  try {
    getDbInfo().then((r) => res.status(200).send(r));
  } catch (err) {
    console.log("entré al catch del get /db_videogames", err);
  }
});

router.get("/genres", (req, res) => {
  try {
    getApiInfo()
      .then((r) => r.map((v) => v.genres))
      .then((r) => [...new Set(r.flat())])
      .then((r) =>
        r.forEach((genre) => {
          Genre.findOrCreate({
            where: { name: genre },
          });
        })
      );
  } catch (err) {
    console.log("entré al catch del get /genres", err);
  } finally {
    Genre.findAll().then((r) => res.send(r));
  }
});

router.post("/videogame", (req, res) => {
  try {
    let {
      name,
      description,
      released,
      rating,
      platforms,
      image,
      createdInDB,
      genres,
    } = req.body;
    if (
      name &&
      description.length &&
      released &&
      rating &&
      image &&
      platforms.length &&
      genres.length
    ) {
      Videogame.create({
        name,
        description,
        released,
        rating,
        platforms,
        image,
        createdInDB,
      }).then((newVideogame) =>
        Genre.findAll({
          where: { name: genres },
        }).then((genre) => newVideogame.addGenre(genre))
      );
      res.send("Juego creado con exito");
    } else {
      res.status(400).send("Faltaron datos para crear el juego");
    }
  } catch (err) {
    console.log("entre al catch del post", err);
    res.status(400).send(err);
  }
});

router.get("/videogame/:id", (req, res) => {
  const { id } = req.params;
  try {
    const findInDB = getDbInfo().then((r) =>
      r.find((game) => String(game.id) === id)
    );
    const findInApi = getApiInfo().then((r) =>
      r.find((game) => game.id === Number(id))
    );
    findInDB.then((r) =>
      r
        ? res.send(r)
        : findInApi.then((r) =>
            r
              ? axios
                  .get(`https://api.rawg.io/api/games/${id}?key=${API_KEY}`)
                  .then((r) => {
                    let {
                      name,
                      genres,
                      background_image,
                      description,
                      released,
                      rating,
                      platforms,
                    } = r.data;
                    const game = {
                      id,
                      name,
                      genres: genres.map((e) => e.name),
                      image: background_image,
                      description: description
                        .replaceAll("<p>", "")
                        .replaceAll("</p>", "")
                        .replaceAll("<br />", ""),
                      released,
                      rating,
                      platforms: platforms.map((e) => e.platform.name),
                    };
                    res.send(game);
                  })
              : res.status(404).send("No existe el juego")
          )
    );
  } catch (err) {
    console.log("entré al catch del get /videogame/:id", err);
  }
});

router.delete("/deleted/:id", (req, res) => {
  const { id } = req.params;
  try {
    Videogame.findByPk(id).then((r) => r.destroy());
    res.send(200, "Juego eliminado con éxito");
  } catch (err) {
    res.send("entré al catch del get /deleted/:id", err);
  }
});

module.exports = router;
