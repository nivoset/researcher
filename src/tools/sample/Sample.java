import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

public interface UserService {
    User getUserById(int id);
}

@RestController
public class UserController {
    private int id;
    private String name;

    public UserController(int id, String name) {
        this.id = id;
        this.name = name;
    }

    @GetMapping("/id")
    public int getId() {
        return id;
    }

    @GetMapping("/name")
    public String getName() {
        return name;
    }

    public void multiLineInput(
        int id,
        String name,
        int age,
        String address,
        String phone,
        String email,
        String password
    ) {
        // public
    }

    private void helper() {
        // not public
    }
} 